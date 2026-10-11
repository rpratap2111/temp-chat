import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';
import { importRoomKey, encryptPayload, decryptPayload, randomToken } from '../lib/crypto';
import { sanitizeReply, toReplyRef } from '../lib/reply';

const SocketContext = createContext(null);

// Only these types are given their real MIME type (and shown inline). Anything
// else becomes an opaque download, so a participant cannot send an HTML or SVG
// "file" that would run script on this site if opened.
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

// A message still marked "sending" after this long is shown as failed.
const SEND_TIMEOUT_MS = 15000;
// Typing indicators clear themselves if the "stopped typing" signal is lost.
const TYPING_EXPIRY_MS = 5000;

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [room, setRoom] = useState(null);
    const [me, setMe] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    // Usernames of people currently typing.
    const [typingUsers, setTypingUsers] = useState([]);

    const socketRef = useRef(null);
    const keyRef = useRef(null);
    const messagesRef = useRef([]);
    const objectUrlsRef = useRef(new Set());
    const myNameRef = useRef('');
    // Message ids this client has already reported as read.
    const reportedReadRef = useRef(new Set());
    const typingTimersRef = useRef(new Map());
    // Decryption is async; this chain keeps message events in arrival order.
    const queueRef = useRef(Promise.resolve());

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const enqueue = useCallback((task) => {
        queueRef.current = queueRef.current.then(task).catch((error) => console.error(error));
    }, []);

    const revokeObjectUrls = useCallback(() => {
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrlsRef.current.clear();
    }, []);

    const decodeMessage = useCallback(async (raw) => {
        const base = {
            id: raw.id,
            username: raw.username,
            messageType: raw.messageType,
            timeStamp: raw.timeStamp,
            burnAt: raw.burnAt,
            pinned: raw.pinned,
            status: raw.status || 'sent',
            clientId: raw.clientId,
        };
        if (raw.messageType === 'system') return { ...base, text: raw.text };

        try {
            const { header, fileBytes } = await decryptPayload(keyRef.current, raw.ciphertext, raw.iv);
            const message = {
                ...base,
                text: typeof header.text === 'string' ? header.text : '',
                replyTo: sanitizeReply(header.replyTo),
            };
            if (header.file && fileBytes) {
                const type = IMAGE_TYPES.has(header.file.type) ? header.file.type : 'application/octet-stream';
                const url = URL.createObjectURL(new Blob([fileBytes], { type }));
                objectUrlsRef.current.add(url);
                message.file = {
                    name: String(header.file.name || 'file').slice(0, 200),
                    size: fileBytes.length,
                    isImage: IMAGE_TYPES.has(type),
                    url,
                };
            }
            return message;
        } catch {
            return { ...base, undecryptable: true };
        }
    }, []);

    // Drops the connection and clears room state. Object URLs are kept so the
    // closed-room takeaway can still offer pinned files; resetRoomState frees them.
    const disconnectSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        keyRef.current = null;
        typingTimersRef.current.forEach((timer) => clearTimeout(timer));
        typingTimersRef.current.clear();
        reportedReadRef.current.clear();
        setTypingUsers([]);
        setIsConnected(false);
        setMessages([]);
        setUsers([]);
        setRoom(null);
        setMe(null);
    }, []);

    const resetRoomState = useCallback(() => {
        disconnectSocket();
        revokeObjectUrls();
    }, [disconnectSocket, revokeObjectUrls]);

    // Opens a socket for the session and joins the room on every (re)connect.
    // Returns the socket so the caller can handle room-level events.
    const connectSocket = useCallback(async (session) => {
        const key = await importRoomKey(session.key);
        disconnectSocket();
        keyRef.current = key;
        myNameRef.current = session.username;

        const socket = io(SERVER_URL, { withCredentials: true });

        // Tell the server which of other people's messages arrived here.
        const reportDelivered = (list) => {
            const ids = list
                .filter((m) => m.messageType === 'user' && m.username !== myNameRef.current && m.status !== 'read')
                .map((m) => m.id);
            if (ids.length) socket.emit('markDelivered', { ids });
        };

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('joinRoom', {
                roomCode: session.roomCode,
                username: session.username,
                memberToken: session.memberToken,
                hostToken: session.hostToken,
                password: session.password,
            });
        });

        socket.on('disconnect', () => setIsConnected(false));

        socket.on('joined', (data) => enqueue(async () => {
            revokeObjectUrls();
            const history = await Promise.all(data.history.map(decodeMessage));
            reportedReadRef.current.clear();
            // Keep messages still being sent; they are not in the server's history yet.
            setMessages((prev) => [...history, ...prev.filter((m) => m.status === 'sending')]);
            reportDelivered(history);
            setRoom(data.room);
            setMe({ username: data.username, isHost: data.isHost });
        }));

        socket.on('message', (raw) => enqueue(async () => {
            const message = await decodeMessage(raw);
            message.isNew = true;
            const isOwnEcho = message.clientId
                && messagesRef.current.some((m) => m.clientId === message.clientId && m.status === 'sending');
            if (isOwnEcho) {
                // Our own message came back from the server: swap the
                // optimistic copy for the stored one, keeping its place.
                setMessages((prev) => prev.map((m) => {
                    if (m.clientId !== message.clientId) return m;
                    if (m.file) URL.revokeObjectURL(m.file.url);
                    return { ...message, isNew: false };
                }));
                return;
            }
            setMessages((prev) => [...prev, message]);
            reportDelivered([message]);
        }));

        socket.on('messageStatus', ({ id, status }) => enqueue(() => {
            setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
        }));

        // A send the server refused names its message, so it can show as failed.
        socket.on('error', ({ clientId }) => {
            if (!clientId) return;
            setMessages((prev) => prev.map((m) => (
                m.clientId === clientId && m.status === 'sending' ? { ...m, status: 'failed' } : m
            )));
        });

        socket.on('typing', ({ username, isTyping }) => {
            const timers = typingTimersRef.current;
            clearTimeout(timers.get(username));
            timers.delete(username);
            if (isTyping) {
                timers.set(username, setTimeout(() => {
                    timers.delete(username);
                    setTypingUsers((prev) => prev.filter((u) => u !== username));
                }, TYPING_EXPIRY_MS));
                setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
            } else {
                setTypingUsers((prev) => prev.filter((u) => u !== username));
            }
        });

        socket.on('messageDeleted', ({ id }) => enqueue(() => {
            const target = messagesRef.current.find((m) => m.id === id);
            if (target?.file) {
                URL.revokeObjectURL(target.file.url);
                objectUrlsRef.current.delete(target.file.url);
            }
            setMessages((prev) => prev.filter((m) => m.id !== id));
        }));

        socket.on('messagePinned', ({ id, pinned }) => enqueue(() => {
            setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pinned } : m)));
        }));

        socket.on('userList', (list) => {
            setUsers(list);
            // Someone who went offline is not typing any more.
            setTypingUsers((prev) => prev.filter((name) => list.some((u) => u.username === name && u.online)));
        });
        socket.on('roomUpdated', setRoom);
        // The previous host handed the room to us.
        socket.on('hostChanged', ({ isHost }) => setMe((prev) => (prev ? { ...prev, isHost } : prev)));

        socketRef.current = socket;
        return socket;
    }, [decodeMessage, disconnectSocket, enqueue, revokeObjectUrls]);

    const emit = useCallback((event, payload) => {
        socketRef.current?.emit(event, payload);
    }, []);

    // Shows the message straight away with a clock, then sends it. The server's
    // echo (matched by clientId) replaces this copy and starts the ticks.
    const sendOptimistic = useCallback(async ({ text, file, burnSeconds, replyTo }) => {
        if (!keyRef.current) return;
        const clientId = randomToken().slice(0, 24);
        const now = Date.now();
        const header = { text, replyTo: toReplyRef(replyTo) };
        let bytes = null;
        let localFile;
        if (file) {
            bytes = new Uint8Array(await file.arrayBuffer());
            header.file = { name: file.name, type: file.type };
            const isImage = IMAGE_TYPES.has(file.type);
            const url = URL.createObjectURL(new Blob([bytes], { type: isImage ? file.type : 'application/octet-stream' }));
            localFile = { name: file.name, size: bytes.length, isImage, url };
        }

        setMessages((prev) => [...prev, {
            id: `local-${clientId}`,
            clientId,
            username: myNameRef.current,
            messageType: 'user',
            text,
            file: localFile,
            replyTo: replyTo ? toReplyRef(replyTo) : null,
            timeStamp: new Date(now).toISOString(),
            burnAt: burnSeconds ? new Date(now + burnSeconds * 1000).toISOString() : null,
            pinned: false,
            status: 'sending',
            isNew: true,
        }]);

        const encrypted = await encryptPayload(keyRef.current, header, bytes);
        emit('sendMessage', { ...encrypted, burnSeconds, clientId });

        setTimeout(() => {
            setMessages((prev) => prev.map((m) => (
                m.clientId === clientId && m.status === 'sending' ? { ...m, status: 'failed' } : m
            )));
        }, SEND_TIMEOUT_MS);
    }, [emit]);

    // `replyTo` is the message being replied to, or null.
    const sendText = useCallback((text, burnSeconds, replyTo = null) => {
        if (!text.trim()) return Promise.resolve();
        return sendOptimistic({ text: text.trim(), burnSeconds, replyTo });
    }, [sendOptimistic]);

    const sendFile = useCallback((file, caption, burnSeconds, replyTo = null) => (
        sendOptimistic({ text: caption.trim(), file, burnSeconds, replyTo })
    ), [sendOptimistic]);

    // Reports other people's messages as read. Called while the chat is visible.
    const markRead = useCallback((list) => {
        const reported = reportedReadRef.current;
        const ids = list
            .filter((m) => m.messageType === 'user' && m.username !== myNameRef.current
                && !m.id.startsWith('local-') && !reported.has(m.id))
            .map((m) => m.id);
        if (!ids.length) return;
        ids.forEach((id) => reported.add(id));
        emit('markRead', { ids });
    }, [emit]);

    const setTyping = useCallback((isTyping) => emit('typing', { isTyping }), [emit]);

    // Drops a message that failed to send from this screen.
    const discardMessage = useCallback((clientId) => {
        setMessages((prev) => prev.filter((m) => m.clientId !== clientId));
    }, []);

    // Tells the server this is a deliberate exit (so the room's end policy
    // applies immediately), then drops the connection once it is acknowledged.
    // `newHost` (host only) hands the room to that person instead of closing it.
    const leaveRoom = useCallback((newHost) => {
        const socket = socketRef.current;
        socketRef.current = null;
        if (socket) {
            socket.removeAllListeners();
            socket.timeout(2000).emit('leaveRoom', newHost ? { newHost } : {}, () => socket.disconnect());
        }
        disconnectSocket();
    }, [disconnectSocket]);

    const getPinnedMessages = useCallback(
        () => messagesRef.current.filter((m) => m.pinned && !m.undecryptable),
        [],
    );

    const value = {
        messages,
        users,
        room,
        me,
        isConnected,
        connectSocket,
        disconnectSocket,
        resetRoomState,
        leaveRoom,
        sendText,
        sendFile,
        markRead,
        typingUsers,
        setTyping,
        discardMessage,
        getPinnedMessages,
        deleteMessage: (id) => emit('deleteMessage', { id }),
        setPinned: (id, pinned) => emit('pinMessage', { id, pinned }),
        kickUser: (username) => emit('kickUser', { username }),
        setMuted: (username, muted) => emit('muteUser', { username, muted }),
        updateSettings: (settings) => emit('updateSettings', settings),
        extendRoom: (minutes) => emit('extendRoom', { minutes }),
        closeRoom: () => emit('closeRoom'),
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
