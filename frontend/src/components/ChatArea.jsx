import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import MessageList from './MessageList';

function ChatArea({ roomCode, username }) {
    const { messages, sendMessage } = useSocket();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = () => {
        const trimmed = newMessage.trim();
        if (!trimmed) return;
        sendMessage(roomCode, username, trimmed);
        setNewMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    return (
        <div className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4 
                rounded-2xl 
                bg-gradient-to-br from-white/20 via-white/10 to-white/5 
                dark:from-white/10 dark:via-white/5 dark:to-white/0 
                backdrop-blur-xl 
                shadow-lg
                border border-white/30 
                transition-all duration-500
                max-h-[calc(100vh-200px)]
                min-h-0
                custom-scrollbar">
                <MessageList messages={messages} currentUsername={username} />
                <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 px-2 flex-shrink-0">
                <div className="flex gap-3 
                    bg-white/40 dark:bg-white/10 
                    backdrop-blur-lg 
                    p-3 
                    rounded-xl 
                    border border-white/20">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 bg-transparent border-none 
                            text-black dark:text-white 
                            placeholder-gray-500 dark:placeholder-gray-400 
                            focus:outline-none"
                    />
                    <button
                        onClick={handleSendMessage}
                        className="bg-blue-600 hover:bg-blue-700 text-white 
                            px-4 py-2 rounded-xl 
                            transition duration-200 
                            flex items-center gap-2"
                    >
                        <Send size={16} />
                        <span className="hidden sm:inline">Send</span>
                    </button>
                </div>
            </div>

            <style jsx = 'true'>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(59, 130, 246, 0.7);
                }
                /* Firefox */
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(59, 130, 246, 0.5) transparent;
                }
            `}</style>
        </div>
    );
}

export default ChatArea;