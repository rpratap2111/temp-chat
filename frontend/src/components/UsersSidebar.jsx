import React from 'react';
import { Crown, MicOff, Mic, UserX } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';

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
        <div className={isMobile ? 'w-full' : 'w-64 flex-shrink-0 h-full flex flex-col border-l border-line bg-surface'}>
            <div className="flex items-center justify-between h-12 px-4 flex-shrink-0 border-b border-line">
                <span className="text-sm font-medium text-ink">People</span>
                <span className="font-mono text-xs tabular-nums text-ink-3">{users.length}</span>
            </div>

            <div className={`p-2 space-y-0.5 overflow-y-auto custom-scrollbar ${isMobile ? 'max-h-72' : 'flex-1 min-h-0'}`}>
                {users.map((user) => (
                    <div key={user.username} className={`flex items-center gap-2 min-h-12 px-2 py-1 rounded-lg ${user.online ? '' : 'opacity-60'}`}>
                        <div className="relative flex-shrink-0">
                            <Avatar name={user.username} />
                            <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${user.online ? 'bg-positive' : 'bg-ink-3'}`}
                                title={user.online ? 'Online' : 'Reconnecting'}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm text-ink truncate">
                                {user.username}
                                {user.username === me?.username && <span className="text-ink-3"> (you)</span>}
                            </div>
                            {(user.isHost || user.muted || !user.online) && (
                                <div className="flex items-center gap-2 text-xs text-ink-3">
                                    {user.isHost && (
                                        <span className="inline-flex items-center gap-1"><Crown size={12} /> Host</span>
                                    )}
                                    {user.muted && (
                                        <span className="inline-flex items-center gap-1 text-negative"><MicOff size={12} /> Muted</span>
                                    )}
                                    {!user.online && <span>Reconnecting…</span>}
                                </div>
                            )}
                        </div>

                        {me?.isHost && !user.isHost && (
                            <div className="flex flex-shrink-0">
                                <button
                                    onClick={() => setMuted(user.username, !user.muted)}
                                    className="btn-icon-sm"
                                    aria-label={user.muted ? `Unmute ${user.username}` : `Mute ${user.username}`}
                                    title={user.muted ? 'Unmute' : 'Mute'}
                                >
                                    {user.muted ? <Mic size={16} /> : <MicOff size={16} />}
                                </button>
                                <button
                                    onClick={() => handleKick(user.username)}
                                    className="btn-icon-sm hover:text-negative"
                                    aria-label={`Remove ${user.username}`}
                                    title="Remove from room"
                                >
                                    <UserX size={16} />
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
