import React, { createContext, useState, useContext, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

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
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    const SOCKET_URL = 'http://localhost:4000';

    const connectSocket = (roomCode, username) => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        const socket = io(SOCKET_URL, {
            withCredentials: true,
        });

        socket.on('connect', () => {
            setIsConnected(true);
            console.log('✅ Connected to socket server');
            socket.emit('joinRoom', { roomCode, username });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            console.log('🔌 Disconnected from socket server');
        });

        socket.on('message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('userJoined', (data) => {
            setMessages(prev => [...prev, {
                messageType: 'system',
                message: data.message,
                timeStamp: data.timeStamp
            }]);
        });

        socket.on('userLeft', (data) => {
            setMessages(prev => [...prev, {
                messageType: 'system',
                message: data.message,
                timeStamp: data.timeStamp
            }]);
        });

        socket.on('userList', (userList) => {
            setUsers(userList);
        });

        socketRef.current = socket;
        return socketRef.current;
    };

    const disconnectSocket = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
            setMessages([]);
            setUsers([]);
        }
    };

    const sendMessage = (roomCode, username, message) => {
        if (socketRef.current && message.trim()) {
            socketRef.current.emit('sendMessage', {
                roomCode,
                username,
                message: message.trim(),
            });
        }
    };

    const leaveRoom = () => {
        if (socketRef.current) {
            socketRef.current.emit('leaveRoom');
        }
    };

    const value = {
        socket: socketRef.current,
        messages,
        users,
        isConnected,
        connectSocket,
        disconnectSocket,
        sendMessage,
        leaveRoom,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
