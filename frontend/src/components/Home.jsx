import React, { useEffect, useState } from 'react';
import { MessageCircle, UserPlus, LogIn, Moon, Sun } from 'lucide-react';
import { createRoom, checkRoom } from '../services/api';
import Mode from './Mode';

function Home({ onNavigateToRoom }) {
    const [username, setUsername] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateRoom = async () => {
        if (!username.trim() || roomCode.trim().length !== 6) {
            setError('Username and a valid 6-character Room Code are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await createRoom(username.trim(), roomCode.trim());

            if (data.success) {
                onNavigateToRoom({
                    roomCode: roomCode.trim(),
                    username: username.trim(),
                    isCreator: true,
                });
            } else {
                setError(data.message || 'Failed to create room');
            }
        } catch (error) {
            setError(error.message || 'Network Error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!username.trim() || roomCode.trim().length !== 6) {
            setError('Username and a valid 6-character Room Code are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await checkRoom(roomCode.trim());

            if (data.success) {
                onNavigateToRoom({
                    roomCode: roomCode.trim(),
                    username: username.trim(),
                    isCreator: false,
                });
            } else {
                setError(data.message || 'Room not found');
            }
        } catch (error) {
            setError(error.message || 'Network Error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-200 via-indigo-100 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
            <Mode />
            <div className="w-full max-w-md p-8 rounded-2xl shadow-xl bg-white/30 dark:bg-white/10 backdrop-blur-lg border border-white/20 animate-fadein">
                <div className="text-center mb-8">
                    <MessageCircle className="mx-auto mb-4 text-blue-600 dark:text-blue-400" size={48} />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Temp Chat</h1>
                    <p className="text-gray-600 dark:text-gray-300">Create or join a temporary chat room</p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-400/20 border border-red-300 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={loading}
                    />

                    <input
                        type="text"
                        placeholder="Enter room code (6 characters)"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={loading}
                    />

                    <button
                        onClick={handleCreateRoom}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <UserPlus size={20} />
                        {loading ? 'Creating...' : 'Create Room'}
                    </button>

                    <button
                        onClick={handleJoinRoom}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <LogIn size={20} />
                        {loading ? 'Joining...' : 'Join Room'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fadein {
                    animation: fadeIn 0.7s ease-in-out;
                }
            `}</style>
        </div>
    );
}

export default Home;
