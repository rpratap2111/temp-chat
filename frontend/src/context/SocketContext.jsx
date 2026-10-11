import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';
import { importRoomKey, encryptPayload, decryptPayload } from '../lib/crypto';
import { sanitizeReply, toReplyRef } from '../lib/reply';

const SocketContext = createContext(null);

// Only these types are given their real MIME type (and shown inline). Anything
// else becomes an opaque download, so a participant cannot send an HTML or SVG
// "file" that would run script on this site if opened.
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

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

    const socketRef = useRef(null);
    const keyRef = useRef(null);
    const messagesRef = useRef([]);
    const objectUrlsRef = useRef(new Set());
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

        const socket = io(SERVER_URL, { withCredentials: true });

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
            setMessages(history);
            setRoom(data.room);
            setMe({ username: data.username, isHost: data.isHost });
        }));

        socket.on('message', (raw) => enqueue(async () => {
            const message = await decodeMessage(raw);
            setMessages((prev) => [...prev, message]);
        }));

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

        socket.on('userList', setUsers);
        socket.on('roomUpdated', setRoom);

        socketRef.current = socket;
        return socket;
    }, [decodeMessage, disconnectSocket, enqueue, revokeObjectUrls]);

    const emit = useCallback((event, payload) => {
        socketRef.current?.emit(event, payload);
    }, []);

    // `replyTo` is the message being replied to, or null.
    const sendText = useCallback(async (text, burnSeconds, replyTo = null) => {
        if (!keyRef.current || !text.trim()) return;
        const encrypted = await encryptPayload(keyRef.current, { text: text.trim(), replyTo: toReplyRef(replyTo) });
        emit('sendMessage', { ...encrypted, burnSeconds });
    }, [emit]);

    const sendFile = useCallback(async (file, caption, burnSeconds, replyTo = null) => {
        if (!keyRef.current) return;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const encrypted = await encryptPayload(
            keyRef.current,
            { text: caption.trim(), file: { name: file.name, type: file.type }, replyTo: toReplyRef(replyTo) },
            bytes,
        );
        emit('sendMessage', { ...encrypted, burnSeconds });
    }, [emit]);

    // Tells the server this is a deliberate exit (so the room's end policy
    // applies immediately), then drops the connection once it is acknowledged.
    const leaveRoom = useCallback(() => {
        const socket = socketRef.current;
        socketRef.current = null;
        if (socket) {
            socket.removeAllListeners();
            socket.timeout(2000).emit('leaveRoom', () => socket.disconnect());
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
