import React from 'react';
import { Users } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

function UsersSidebar() {
    const { users } = useSocket();

    return (
        <div className="w-64 m-4 ml-0 rounded-2xl 
            bg-gradient-to-br from-white/30 to-white/10 
            dark:from-white/10 dark:to-white/5 
            backdrop-blur-xl 
            border border-white/30 
            shadow-xl transition-colors duration-300">
            
            {/* Header */}
            <div className="p-4 border-b border-white/20">
                <div className="flex items-center gap-2 text-gray-800 dark:text-white font-semibold">
                    <Users size={20} />
                    Users ({users.length})
                </div>
            </div>

            {/* User list */}
            <div className="p-4 space-y-3 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
                {users.map((user, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-xl 
                            bg-white/40 dark:bg-white/5 
                            backdrop-blur-md 
                            border border-white/20 shadow-inner"
                    >
                        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-medium text-gray-800 dark:text-white">
                                {user.username}
                            </div>
                            {user.isCreator && (
                                <div className="text-xs text-blue-500 font-semibold">
                                    Creator
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default UsersSidebar;
