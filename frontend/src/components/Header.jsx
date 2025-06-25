import React, { useState } from 'react';
import { MessageCircle, Copy, Check, LogOut } from 'lucide-react';

function Header({ roomCode, username, onLeaveRoom }) {
    const [copied, setCopied] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const handleCopyRoomCode = () => {
        navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLeaveClick = () => {
        setIsLeaving(true);
        setTimeout(() => {
            onLeaveRoom();
        }, 2500);
    };

    return (
        <div className="w-full flex justify-center mt-4 px-2">
            <div className="w-full max-w-280 flex items-center justify-between px-6 py-4 rounded-2xl shadow-md backdrop-blur-lg bg-white/30 dark:bg-white/10 border border-white/20 transition-colors duration-300">
                <div className="flex items-center gap-3">
                    <MessageCircle className="text-blue-600 dark:text-blue-400" size={28} />
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 dark:text-white">
                            Room: {roomCode}
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Welcome, {username}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopyRoomCode}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl shadow transition duration-200"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy Code'}
                    </button>

                    <button
                        onClick={handleLeaveClick}
                        disabled={isLeaving}
                        className={`flex items-center gap-2 px-4 py-2 font-medium rounded-xl shadow transition duration-200 ${
                            isLeaving
                                ? 'bg-red-400/60 text-white cursor-wait'
                                : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    >
                        <LogOut size={16} />
                        {isLeaving ? 'Leaving...' : 'Leave'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Header;
