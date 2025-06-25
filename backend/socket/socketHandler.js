const Room = require('../models/room');
const Message = require('../models/message');
const activeRooms = require('../utils/activeRooms');

function socketHandler(io) {
    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        socket.on('joinRoom', async ({ roomCode, username }) => {
            try {
                if (!roomCode || !username || roomCode.length !== 6 || !username.trim()) {
                    socket.emit('error', { message: 'Invalid Room Code or Username' });
                    return;
                }

                const uName = username.trim();
                const rCode = roomCode.toUpperCase();
                const room = await Room.findActiveRoom(rCode);

                if (!room) {
                    socket.emit('roomError', { message: 'Room not found or expired' });
                    return;
                }

                socket.join(rCode);
                socket.roomCode = rCode;
                socket.username = uName;
                socket.isCreator = room.createdBy === uName;

                if (!activeRooms.has(rCode)) {
                    activeRooms.set(rCode, { users: [], createdAt: room.createdAt, createdBy: room.createdBy });
                }

                const roomData = activeRooms.get(rCode);

                if (roomData.users.some(user => user.username === uName)) {
                    socket.emit('error', { message: 'Username already taken in this room.' });
                    return;
                }

                roomData.users.push({
                    id: socket.id,
                    username: uName,
                    isCreator: socket.isCreator,
                    joinedAt: new Date()
                });

                const messages = await Message.getRecentMessages(rCode);
                socket.emit('previousMessages', messages);

                await Message.createSystemMessage(rCode, `${uName} joined the chat.`);

                socket.to(rCode).emit('userJoined', {
                    username: uName,
                    message: `${uName} joined the chat.`,
                    timeStamp: new Date()
                });

                io.to(rCode).emit('userList', roomData.users.map(user => ({ username: user.username, isCreator: user.isCreator })));

                console.log(`User ${uName} joined room ${rCode}`);
            } catch (error) {
                console.error(`Error joining room:`, error);
                socket.emit('error', { message: 'Error joining room' });
            }
        });

        socket.on('sendMessage', async ({ roomCode, username, message }) => {
            try {
                if (!message || !message.trim()) return;

                const tMessage = message.trim();
                const rCode = roomCode.toUpperCase();

                if (socket.roomCode !== rCode || socket.username !== username) {
                    socket.emit('error', { message: 'You are not authorized to send messages in this room.' });
                    return;
                }

                const newMessage = new Message({
                    roomCode: rCode,
                    username,
                    message: tMessage,
                    messageType: 'user'
                });
                await newMessage.save();

                io.to(rCode).emit('message', {
                    username,
                    message: tMessage,
                    timeStamp: new Date(),
                    messageType: 'user'
                });
            } catch (error) {
                console.error(`Error sending message: ${error.message}`);
                socket.emit('error', { message: 'Error sending message' });
            }
        });

        socket.on('leaveRoom', async () => {
            await handleUserLeave(socket, false);
        });

        socket.on('disconnect', async () => {
            console.log(`Client disconnected: ${socket.id}`);
            await handleUserLeave(socket, true);
        });

        async function handleUserLeave(socket, isDisconnect = false) {
            try {
                if (!socket.roomCode || !socket.username) return;

                const rCode = socket.roomCode;
                const username = socket.username;
                const isCreator = socket.isCreator;
                const roomData = activeRooms.get(rCode);
                if (!roomData) return;

                roomData.users = roomData.users.filter(user => user.id !== socket.id);

                const action = isDisconnect ? 'disconnected from' : 'left';
                const sMessage = `${username} ${action} the room.`;

                if (isCreator) {
                    try {
                        await Room.findOneAndUpdate({ roomCode: rCode, active: true }, { active: false });
                        await Message.createSystemMessage(rCode, `Room ${rCode} has been closed by the creator.`);
                        await Room.deleteOne({ roomCode: rCode });
                        await Message.deleteMany({ roomCode: rCode });

                        io.to(rCode).emit('roomClosed', {
                            message: `Room creator has ${action} the chat. Room will be closed.`,
                            reason: 'creator_left'
                        });

                        const socketsInRoom = await io.in(rCode).fetchSockets();
                        socketsInRoom.forEach(sock => {
                            sock.leave(rCode);
                            sock.disconnect(true);
                        });

                        activeRooms.delete(rCode);
                        console.log(`Room ${rCode} has been closed.`);
                    } catch (error) {
                        console.error(`Error closing room ${rCode}:`, error);
                        io.to(rCode).emit('error', { message: 'Error closing room' });
                    }
                } else {
                    await Message.createSystemMessage(rCode, sMessage);

                    socket.to(rCode).emit('userLeft', {
                        username,
                        message: sMessage,
                        timeStamp: new Date()
                    });

                    io.to(rCode).emit('userList', roomData.users.map(user => ({
                        username: user.username,
                        isCreator: user.isCreator
                    })));

                    console.log(`User ${username} has left room ${rCode}.`);
                }

                socket.leave(rCode);
            } catch (error) {
                console.error('Error handling user leave:', error);
            }
        }
    });
}

module.exports = socketHandler;
