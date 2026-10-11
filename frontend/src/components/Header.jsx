import React from 'react';
import { MessageCircle, LogOut, QrCode, Settings, Lock, ShieldCheck, Power } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import Mode from './Mode';
import Countdown from './Countdown';
import { TypingDots, TypingLabel } from './Typing';

function Header({ roomCode, username, onInvite, onHostControls, onLeaveRoom, exitLabel = 'Leave', exitEndsRoom = false }) {
    const { room, me, isConnected, typingUsers } = useSocket();

    return (
        <div className="w-full flex justify-center mt-4 px-2">
            <div className="w-full max-w-6xl flex items-center justify-between px-6 py-4 rounded-2xl shadow-md backdrop-blur-lg bg-white/30 dark:bg-white/10 border border-white/20 transition-colors duration-300">
                <div className="flex items-center gap-3">
                    <MessageCircle className="text-blue-600 dark:text-blue-400" size={28} />
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            Room {roomCode}
                            {room?.locked && <Lock size={16} className="text-amber-600" aria-label="Locked" />}
                            <Countdown expiresAt={room?.expiresAt} />
                        </h1>
                        {typingUsers.length > 0 ? (
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                <TypingDots size="sm" />
                                <TypingLabel names={typingUsers} />
                            </p>
                        ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 animate-notice-in">
                                {username}{me?.isHost && ' (host)'}
                                <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                                    <ShieldCheck size={12} /> End-to-end encrypted
                                </span>
                                {!isConnected && <span className="text-xs text-amber-600 dark:text-amber-400">Reconnecting…</span>}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Mode className="" />

                    <button
                        onClick={onInvite}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl shadow transition duration-200"
                    >
                        <QrCode size={16} />
                        Invite
                    </button>

                    {me?.isHost && (
                        <button
                            onClick={onHostControls}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-xl shadow transition duration-200"
                        >
                            <Settings size={16} />
                            Host
                        </button>
                    )}

                    <button
                        onClick={onLeaveRoom}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow transition duration-200"
                    >
                        {exitEndsRoom ? <Power size={16} /> : <LogOut size={16} />}
                        {exitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Header;
