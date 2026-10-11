import React from 'react';
import { Users, Crown, MicOff, Mic, UserX } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

// People in the room. Renders as a fixed-width side panel on desktop, or fills
// its container when `isMobile` is set (inside the mobile popover).
// The host also gets mute and remove buttons for everyone else.
function UsersSidebar({ isMobile = false }) {
    const { users, me, kickUser, setMuted } = useSocket();

    const handleKick = (username) => {
        if (window.confirm(`Remove ${username} from the room? They won't be able to rejoin from this browser tab.`)) {
            kickUser(username);
        }
    };

    return (
        <div className={isMobile
            ? 'w-full'
            : `w-64 m-4 ml-0 rounded-2xl shadow-xl
                bg-gradient-to-br from-white/30 to-white/10
                dark:from-white/10 dark:to-white/5
                backdrop-blur-xl
                border border-white/30
                transition-colors duration-300`}>

            <div className={`p-4 border-b ${isMobile ? 'border-gray-200 dark:border-gray-700' : 'border-white/20'}`}>
                <div className="flex items-center gap-2 text-gray-800 dark:text-white font-semibold">
                    <Users size={20} />
                    People ({users.length})
                </div>
            </div>

            <div className={`p-4 space-y-3 overflow-y-auto custom-scrollbar ${isMobile ? 'max-h-72' : 'max-h-[calc(100vh-160px)]'}`}>
                {users.map((user) => (
                    <div
                        key={user.username}
                        className={`flex items-center gap-3 p-2 rounded-xl
                            bg-white/40 dark:bg-white/5
                            border border-white/20 shadow-inner ${user.online ? '' : 'opacity-60'}`}
                    >
                        <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${user.online ? 'bg-green-500' : 'bg-gray-400'}`}
                                title={user.online ? 'Online' : 'Reconnecting'}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-800 dark:text-white truncate flex items-center gap-1">
                                {user.username}
                                {user.username === me?.username && <span className="text-xs text-gray-500">(you)</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                {user.isHost && (
                                    <span className="inline-flex items-center gap-0.5 text-blue-500 font-semibold">
                                        <Crown size={12} /> Host
                                    </span>
                                )}
                                {user.muted && (
                                    <span className="inline-flex items-center gap-0.5 text-red-500">
                                        <MicOff size={12} /> Muted
                                    </span>
                                )}
                                {!user.online && <span className="text-gray-500">Reconnecting…</span>}
                            </div>
                        </div>

                        {me?.isHost && !user.isHost && (
                            <div className="flex gap-1 flex-shrink-0">
                                <button
                                    onClick={() => setMuted(user.username, !user.muted)}
                                    className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10"
                                    aria-label={user.muted ? `Unmute ${user.username}` : `Mute ${user.username}`}
                                    title={user.muted ? 'Unmute' : 'Mute'}
                                >
                                    {user.muted ? <Mic size={14} /> : <MicOff size={14} />}
                                </button>
                                <button
                                    onClick={() => handleKick(user.username)}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    aria-label={`Remove ${user.username}`}
                                    title="Remove from room"
                                >
                                    <UserX size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default UsersSidebar;
