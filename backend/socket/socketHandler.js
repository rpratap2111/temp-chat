const mongoose = require('mongoose');
const Room = require('../models/room');
const Message = require('../models/message');
const activeRooms = require('../utils/activeRooms');
const { normalizeRoomCode, normalizeUsername, normalizeToken, isBase64 } = require('../utils/validation');
const { sha256, safeEqualHex, verifyPassword } = require('../utils/security');
const { createRateLimiter } = require('../utils/rateLimiter');
const {
  BURN_OPTIONS_SECONDS,
  SLOW_MODE_OPTIONS_SECONDS,
  EXTEND_OPTIONS_MINUTES,
  MAX_LIFETIME_MINUTES,
  RECONNECT_GRACE_MS,
  HISTORY_LIMIT,
  MAX_CIPHERTEXT_LENGTH,
  ROOM_STORAGE_CAP_BYTES,
  MESSAGE_RATE,
  JOIN_FAIL_RATE,
} = require('../utils/constants');

const messageLimiter = createRateLimiter(MESSAGE_RATE);
const joinFailLimiter = createRateLimiter(JOIN_FAIL_RATE);

// Shape a stored message for the client. Ciphertext is passed through as-is;
// only browsers holding the room key can read it.
function toClientMessage(doc) {
  const createdAt = new Date(doc.createdAt);
  return {
    id: String(doc._id),
    username: doc.username,
    messageType: doc.messageType,
    text: doc.messageType === 'system' ? doc.text : undefined,
    ciphertext: doc.ciphertext,
    iv: doc.iv,
    burnSeconds: doc.burnSeconds || 0,
    burnAt: doc.burnSeconds ? new Date(createdAt.getTime() + doc.burnSeconds * 1000) : null,
    pinned: !!doc.pinned,
    timeStamp: createdAt,
  };
}

function roomInfo(rCode, settings) {
  return {
    roomCode: rCode,
    expiresAt: settings.expiresAt,
    locked: settings.locked,
    slowModeSeconds: settings.slowModeSeconds,
    endPolicy: settings.endPolicy,
    requiresPassword: settings.requiresPassword,
  };
}

// Behind a proxy (e.g. Render) set TRUST_PROXY=1 so the real client IP is used.
function clientIp(socket) {
  if (process.env.TRUST_PROXY) {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address;
}

function socketHandler(io) {
  // ---- room state ---------------------------------------------------------
  //
  // activeRooms holds what only matters while people are connected:
  //   members   username -> { token, socketId, isHost, muted, lastMessageAt, leaveTimer }
  //   banned    member tokens the host has removed
  //   settings  cached copy of the room document's settings
  //   timers    the expiry timer and any pending burn timers

  function getState(rCode, room) {
    let state = activeRooms.get(rCode);
    if (!state) {
      state = {
        members: new Map(),
        banned: new Set(),
        burnTimers: new Set(),
        expiryTimer: null,
        closing: false,
        settings: {
          expiresAt: room.expiresAt,
          createdAt: room.createdAt,
          locked: room.locked,
          slowModeSeconds: room.slowModeSeconds,
          endPolicy: room.endPolicy,
          requiresPassword: !!room.passwordHash,
        },
      };
      activeRooms.set(rCode, state);
      scheduleExpiry(rCode, state);
    }
    return state;
  }

  // Mirrors the Mongo TTL on the room document so connected users are told
  // when time is up instead of silently chatting into a deleted room.
  function scheduleExpiry(rCode, state) {
    clearTimeout(state.expiryTimer);
    const delay = Math.max(0, new Date(state.settings.expiresAt).getTime() - Date.now());
    state.expiryTimer = setTimeout(() => {
      closeRoom(rCode, 'This room has expired.', 'expired')
        .catch((error) => console.error(`Error expiring room ${rCode}:`, error));
    }, delay);
  }

  function userList(state) {
    return [...state.members.entries()].map(([username, member]) => ({
      username,
      isHost: member.isHost,
      muted: member.muted,
      online: !!member.socketId,
    }));
  }

  function broadcastUsers(rCode, state) {
    io.to(rCode).emit('userList', userList(state));
  }

  async function postSystem(rCode, state, text) {
    const doc = await Message.createSystemMessage(rCode, text, state.settings.expiresAt);
    io.to(rCode).emit('message', toClientMessage(doc));
  }

  function disconnectSocketById(socketId, rCode, event, payload) {
    const sock = io.sockets.sockets.get(socketId);
    if (!sock) return;
    if (event) sock.emit(event, payload);
    sock.data.roomCode = null;
    sock.leave(rCode);
    sock.disconnect(true);
  }

  // Tears a room down for everyone: notify, disconnect, then delete.
  // The in-memory entry is removed first so the disconnect handlers fired by
  // sock.disconnect() below find no room and do nothing.
  async function closeRoom(rCode, message, reason) {
    const state = activeRooms.get(rCode);
    if (state) {
      if (state.closing) return;
      state.closing = true;
      clearTimeout(state.expiryTimer);
      for (const timer of state.burnTimers) clearTimeout(timer);
      for (const member of state.members.values()) clearTimeout(member.leaveTimer);
      activeRooms.delete(rCode);
    }

    io.to(rCode).emit('roomClosed', { message, reason });

    const socketsInRoom = await io.in(rCode).fetchSockets();
    for (const sock of socketsInRoom) {
      sock.data.roomCode = null;
      sock.leave(rCode);
      sock.disconnect(true);
    }

    await Room.deleteOne({ roomCode: rCode });
    await Message.deleteMany({ roomCode: rCode });
    console.log(`Room ${rCode} closed (${reason}).`);
  }

  // Removes a member for good and applies the room's end policy.
  async function finalizeLeave(rCode, username, action) {
    const state = activeRooms.get(rCode);
    if (!state || state.closing) return;
    const member = state.members.get(username);
    if (!member) return;

    clearTimeout(member.leaveTimer);
    state.members.delete(username);

    if (member.isHost && state.settings.endPolicy === 'host_leaves') {
      await closeRoom(rCode, `The host ${action} the chat. The room is now closed.`, 'host_left');
      return;
    }

    if (state.settings.endPolicy === 'everyone_leaves' && state.members.size === 0) {
      await closeRoom(rCode, 'Everyone has left. The room is now closed.', 'empty');
      return;
    }

    await postSystem(rCode, state, `${username} ${action} the room.`);
    broadcastUsers(rCode, state);
    console.log(`User ${username} ${action} room ${rCode}.`);
  }

  async function deleteMessageById(rCode, id) {
    const doc = await Message.findOneAndDelete({ _id: id, roomCode: rCode });
    if (!doc) return;
    if (doc.size) {
      await Room.updateOne({ roomCode: rCode }, { $inc: { storageBytes: -doc.size } });
    }
    io.to(rCode).emit('messageDeleted', { id: String(doc._id) });
  }

  function scheduleBurn(rCode, state, id, delayMs) {
    const timer = setTimeout(() => {
      state.burnTimers.delete(timer);
      deleteMessageById(rCode, id)
        .catch((error) => console.error(`Error burning message in ${rCode}:`, error));
    }, delayMs);
    state.burnTimers.add(timer);
  }

  // The caller's room, state and member record, or null if this socket is not
  // the live connection for a member of a room.
  function memberContext(socket) {
    const rCode = socket.data.roomCode;
    if (!rCode) return null;
    const state = activeRooms.get(rCode);
    if (!state || state.closing) return null;
    const username = socket.data.username;
    const member = state.members.get(username);
    if (!member || member.socketId !== socket.id) return null;
    return { rCode, state, username, member };
  }

  // Wraps a handler so failures are logged and reported to the caller.
  function handle(socket, name, fn) {
    socket.on(name, async (...args) => {
      try {
        await fn(...args);
      } catch (error) {
        console.error(`Error in ${name}:`, error);
        socket.emit('error', { message: 'Something went wrong. Please try again.' });
      }
    });
  }

  io.on('connection', (socket) => {
    const emitError = (message) => socket.emit('error', { message });
    const fail = (message, code = 'error') => socket.emit('roomError', { message, code });

    // ---- joining ------------------------------------------------------------

    handle(socket, 'joinRoom', async (payload = {}) => {
      if (socket.data.roomCode) return fail('You are already in a room.');

      const uName = normalizeUsername(payload.username);
      const rCode = normalizeRoomCode(payload.roomCode);
      const memberToken = normalizeToken(payload.memberToken);
      if (!uName || !rCode || !memberToken) return fail('Invalid room code or username.', 'invalid');

      const failKey = `${clientIp(socket)}:${rCode}`;
      if (joinFailLimiter.isBlocked(failKey)) {
        return fail('Too many failed attempts. Please try again later.', 'rate_limited');
      }

      const room = await Room.findByCode(rCode);
      if (!room || room.expiresAt <= new Date()) return fail('Room not found or expired.', 'not_found');

      const state = getState(rCode, room);
      const isHost = typeof payload.hostToken === 'string'
        && safeEqualHex(sha256(payload.hostToken), room.hostTokenHash);

      // Someone reclaiming their own seat (after a refresh or reconnect) has
      // already passed the password and lock checks.
      const seat = state.members.get(uName);
      const reclaiming = !!seat && seat.token === memberToken;

      if (!reclaiming && !isHost) {
        if (state.settings.locked) return fail('This room is locked by the host.', 'locked');
        if (room.passwordHash) {
          const ok = await verifyPassword(payload.password, room.passwordHash);
          if (!ok) {
            joinFailLimiter.hit(failKey);
            return fail('Incorrect room password.', 'bad_password');
          }
        }
      }

      // Re-check everything that could have changed during the awaits above.
      if (state.closing || socket.data.roomCode) return fail('Room not found or expired.', 'not_found');
      if (state.banned.has(memberToken)) return fail('You were removed from this room by the host.', 'kicked');

      const existing = state.members.get(uName);
      const isRejoin = !!existing && existing.token === memberToken;
      if (existing && !isRejoin) return fail('That username is already taken in this room.', 'name_taken');

      if (isHost && !isRejoin) {
        for (const [name, member] of state.members) {
          if (member.isHost && name !== uName) {
            return fail('The host is already in this room under another name.', 'host_present');
          }
        }
      }

      let member;
      if (isRejoin) {
        member = existing;
        clearTimeout(member.leaveTimer);
        member.leaveTimer = null;
        // A refreshed tab can arrive before the old connection has dropped.
        if (member.socketId && member.socketId !== socket.id) {
          disconnectSocketById(member.socketId, rCode);
        }
        member.socketId = socket.id;
        member.isHost = member.isHost || isHost;
      } else {
        member = {
          token: memberToken,
          socketId: socket.id,
          isHost,
          muted: false,
          lastMessageAt: 0,
          leaveTimer: null,
        };
        state.members.set(uName, member);
      }

      socket.join(rCode);
      socket.data.roomCode = rCode;
      socket.data.username = uName;
      socket.data.senderKey = sha256(memberToken);

      const history = await Message.getRecentMessages(rCode, HISTORY_LIMIT);
      socket.emit('joined', {
        username: uName,
        isHost: member.isHost,
        room: roomInfo(rCode, state.settings),
        history: history.map(toClientMessage),
      });

      if (!isRejoin) await postSystem(rCode, state, `${uName} joined the chat.`);
      broadcastUsers(rCode, state);

      console.log(`User ${uName} ${isRejoin ? 'rejoined' : 'joined'} room ${rCode}`);
    });

    // ---- messages -----------------------------------------------------------

    handle(socket, 'sendMessage', async (payload = {}) => {
      const ctx = memberContext(socket);
      if (!ctx) return emitError('You are not in a room.');
      const { rCode, state, username, member } = ctx;

      if (member.muted) return emitError('The host has muted you.');

      const { ciphertext, iv } = payload;
      if (!isBase64(ciphertext, MAX_CIPHERTEXT_LENGTH) || !isBase64(iv, 32)) {
        return emitError('That message could not be sent.');
      }
      const burnSeconds = BURN_OPTIONS_SECONDS.includes(payload.burnSeconds) ? payload.burnSeconds : 0;

      if (!messageLimiter.hit(`${rCode}:${username}`)) {
        return emitError('You are sending messages too quickly.');
      }

      const now = Date.now();
      const slow = state.settings.slowModeSeconds;
      if (slow && !member.isHost) {
        const waitMs = member.lastMessageAt + slow * 1000 - now;
        if (waitMs > 0) return emitError(`Slow mode is on. Wait ${Math.ceil(waitMs / 1000)}s.`);
      }
      member.lastMessageAt = now;

      const size = ciphertext.length;
      const reserved = await Room.findOneAndUpdate(
        { roomCode: rCode, storageBytes: { $lte: ROOM_STORAGE_CAP_BYTES - size } },
        { $inc: { storageBytes: size } },
      );
      if (!reserved) return emitError('This room has reached its storage limit.');

      const doc = await Message.create({
        roomCode: rCode,
        username,
        messageType: 'user',
        ciphertext,
        iv,
        size,
        senderKey: socket.data.senderKey,
        burnSeconds,
        expiresAt: burnSeconds ? new Date(now + burnSeconds * 1000) : state.settings.expiresAt,
      });

      io.to(rCode).emit('message', toClientMessage(doc));
      if (burnSeconds) scheduleBurn(rCode, state, doc._id, burnSeconds * 1000);
    });

    handle(socket, 'deleteMessage', async ({ id } = {}) => {
      const ctx = memberContext(socket);
      if (!ctx || !mongoose.isValidObjectId(id)) return;

      const doc = await Message.findOne({ _id: id, roomCode: ctx.rCode, messageType: 'user' });
      if (!doc) return;
      if (doc.senderKey !== socket.data.senderKey && !ctx.member.isHost) {
        return emitError('You can only delete your own messages.');
      }
      await deleteMessageById(ctx.rCode, doc._id);
    });

    // Pinned messages are what the room offers to keep when it closes.
    handle(socket, 'pinMessage', async ({ id, pinned } = {}) => {
      const ctx = memberContext(socket);
      if (!ctx || !mongoose.isValidObjectId(id)) return;

      const doc = await Message.findOneAndUpdate(
        { _id: id, roomCode: ctx.rCode, messageType: 'user' },
        { pinned: !!pinned },
        { new: true },
      );
      if (!doc) return;
      io.to(ctx.rCode).emit('messagePinned', { id: String(doc._id), pinned: doc.pinned, by: ctx.username });
    });

    // ---- host controls ------------------------------------------------------

    function hostContext() {
      const ctx = memberContext(socket);
      if (!ctx) return null;
      if (!ctx.member.isHost) {
        emitError('Only the host can do that.');
        return null;
      }
      return ctx;
    }

    handle(socket, 'kickUser', async ({ username } = {}) => {
      const ctx = hostContext();
      if (!ctx) return;
      const target = ctx.state.members.get(username);
      if (!target || target.isHost) return;

      ctx.state.banned.add(target.token);
      clearTimeout(target.leaveTimer);
      ctx.state.members.delete(username);
      if (target.socketId) {
        disconnectSocketById(target.socketId, ctx.rCode, 'kicked', {
          message: 'You were removed from the room by the host.',
        });
      }

      await postSystem(ctx.rCode, ctx.state, `${username} was removed by the host.`);
      broadcastUsers(ctx.rCode, ctx.state);
    });

    handle(socket, 'muteUser', async ({ username, muted } = {}) => {
      const ctx = hostContext();
      if (!ctx) return;
      const target = ctx.state.members.get(username);
      if (!target || target.isHost || target.muted === !!muted) return;

      target.muted = !!muted;
      await postSystem(ctx.rCode, ctx.state, `${username} was ${target.muted ? 'muted' : 'unmuted'} by the host.`);
      broadcastUsers(ctx.rCode, ctx.state);
    });

    handle(socket, 'updateSettings', async (payload = {}) => {
      const ctx = hostContext();
      if (!ctx) return;
      const { rCode, state } = ctx;
      const update = {};
      const notes = [];

      if (typeof payload.locked === 'boolean' && payload.locked !== state.settings.locked) {
        update.locked = payload.locked;
        notes.push(payload.locked ? 'The host locked the room. No one new can join.' : 'The host unlocked the room.');
      }
      if (SLOW_MODE_OPTIONS_SECONDS.includes(payload.slowModeSeconds)
        && payload.slowModeSeconds !== state.settings.slowModeSeconds) {
        update.slowModeSeconds = payload.slowModeSeconds;
        notes.push(payload.slowModeSeconds
          ? `Slow mode is on: one message every ${payload.slowModeSeconds}s.`
          : 'Slow mode is off.');
      }
      if (!Object.keys(update).length) return;

      await Room.updateOne({ roomCode: rCode }, update);
      Object.assign(state.settings, update);
      io.to(rCode).emit('roomUpdated', roomInfo(rCode, state.settings));
      for (const note of notes) await postSystem(rCode, state, note);
    });

    handle(socket, 'extendRoom', async ({ minutes } = {}) => {
      const ctx = hostContext();
      if (!ctx) return;
      const { rCode, state } = ctx;
      if (!EXTEND_OPTIONS_MINUTES.includes(minutes)) return;

      const current = new Date(state.settings.expiresAt).getTime();
      const limit = new Date(state.settings.createdAt).getTime() + MAX_LIFETIME_MINUTES * 60 * 1000;
      const next = Math.min(Math.max(current, Date.now()) + minutes * 60 * 1000, limit);
      if (next <= current) return emitError('This room has reached its maximum lifetime of 24 hours.');

      const expiresAt = new Date(next);
      await Room.updateOne({ roomCode: rCode }, { expiresAt });
      await Message.updateMany({ roomCode: rCode, burnSeconds: 0 }, { expiresAt });
      state.settings.expiresAt = expiresAt;
      scheduleExpiry(rCode, state);

      io.to(rCode).emit('roomUpdated', roomInfo(rCode, state.settings));
      const added = Math.round((next - current) / 60000);
      await postSystem(rCode, state, `The host extended the room by ${added} minutes.`);
    });

    handle(socket, 'closeRoom', async () => {
      const ctx = hostContext();
      if (!ctx) return;
      await closeRoom(ctx.rCode, 'The host closed the room.', 'host_closed');
    });

    // ---- leaving ------------------------------------------------------------

    // A deliberate exit takes effect immediately. The ack lets the client wait
    // for it before dropping the connection.
    handle(socket, 'leaveRoom', async (ack) => {
      const ctx = memberContext(socket);
      if (ctx) {
        socket.data.roomCode = null;
        socket.leave(ctx.rCode);
        await finalizeLeave(ctx.rCode, ctx.username, 'left');
      }
      if (typeof ack === 'function') ack();
    });

    // A dropped connection keeps its seat for a grace period so a refresh or a
    // brief network loss does not kick the user out (or close the room).
    socket.on('disconnect', () => {
      const ctx = memberContext(socket);
      if (!ctx) return;
      const { rCode, state, username, member } = ctx;

      member.socketId = null;
      broadcastUsers(rCode, state);
      member.leaveTimer = setTimeout(() => {
        finalizeLeave(rCode, username, 'disconnected from')
          .catch((error) => console.error('Error finalizing leave:', error));
      }, RECONNECT_GRACE_MS);
    });
  });
}

module.exports = socketHandler;
