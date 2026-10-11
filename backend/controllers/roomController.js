const Room = require('../models/room');
const { normalizeRoomCode } = require('../utils/validation');
const { randomToken, sha256, generateRoomCode, hashPassword } = require('../utils/security');
const {
  LIFETIME_OPTIONS_MINUTES,
  DEFAULT_LIFETIME_MINUTES,
  END_POLICIES,
  DEFAULT_END_POLICY,
  PASSWORD_MAX_LENGTH,
} = require('../utils/constants');

const MAX_CODE_ATTEMPTS = 5;

exports.createRoom = async (req, res) => {
  try {
    const body = req.body || {};

    const lifetimeMinutes = body.lifetimeMinutes ?? DEFAULT_LIFETIME_MINUTES;
    if (!LIFETIME_OPTIONS_MINUTES.includes(lifetimeMinutes)) {
      return res.status(400).json({ success: false, message: 'Invalid room lifetime' });
    }

    const endPolicy = body.endPolicy ?? DEFAULT_END_POLICY;
    if (!END_POLICIES.includes(endPolicy)) {
      return res.status(400).json({ success: false, message: 'Invalid room ending option' });
    }

    const password = body.password ?? '';
    if (typeof password !== 'string' || password.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({ success: false, message: `Passwords are limited to ${PASSWORD_MAX_LENGTH} characters` });
    }

    const hostToken = randomToken();
    const passwordHash = password ? await hashPassword(password) : null;
    const expiresAt = new Date(Date.now() + lifetimeMinutes * 60 * 1000);

    // Codes are random, so a collision is unlikely; retry a few times if one happens.
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      try {
        const room = await Room.create({
          roomCode: generateRoomCode(),
          hostTokenHash: sha256(hostToken),
          passwordHash,
          endPolicy,
          expiresAt,
        });
        return res.status(201).json({
          success: true,
          roomCode: room.roomCode,
          hostToken,
          expiresAt: room.expiresAt,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    res.status(503).json({ success: false, message: 'Could not allocate a room code. Please try again.' });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getRoom = async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    if (!roomCode) {
      return res.status(400).json({ success: false, message: 'Invalid room code' });
    }

    const room = await Room.findByCode(roomCode);
    if (!room || room.expiresAt <= new Date()) {
      return res.status(404).json({ success: false, message: 'Room not found or expired' });
    }

    res.status(200).json({
      success: true,
      room: {
        roomCode: room.roomCode,
        requiresPassword: !!room.passwordHash,
        locked: room.locked,
        expiresAt: room.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
