import React from 'react';
import { LogOut, QrCode, Settings, Lock, ShieldCheck, Power } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import Mode from './Mode';
import Countdown from './Countdown';
import { TypingDots, TypingLabel } from './Typing';

function Header({ roomCode, username, onInvite, onHostControls, onLeaveRoom, exitLabel = 'Leave', exitEndsRoom = false }) {
    const { room, me, isConnected, typingUsers } = useSocket();

    return (
        <header className="flex items-center justify-between h-16 px-6 bg-surface">
            <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-base font-medium text-ink">
                    <span>Room <span className="font-mono">{roomCode}</span></span>
                    {room?.locked && <Lock size={16} className="text-ink-2" aria-label="Locked" />}
                    <Countdown expiresAt={room?.expiresAt} />
                </h1>
                {typingUsers.length > 0 ? (
                    <p className="flex items-center gap-2 text-xs leading-5 text-ink-2">
                        <TypingDots />
                        <TypingLabel names={typingUsers} />
                    </p>
                ) : (
                    <p className="flex items-center gap-2 text-xs leading-5 text-ink-2">
                        {username}{me?.isHost && ' (host)'}
                        <span className="inline-flex items-center gap-1 text-ink-3">
                            <ShieldCheck size={12} /> End-to-end encrypted
                        </span>
                        {!isConnected && <span className="text-caution">Reconnecting…</span>}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Mode className="" />

                <button onClick={onInvite} className="btn btn-secondary">
                    <QrCode size={16} />
                    Invite
                </button>

                {me?.isHost && (
                    <button onClick={onHostControls} className="btn btn-secondary">
                        <Settings size={16} />
                        Host
                    </button>
                )}

                <button onClick={onLeaveRoom} className="btn btn-danger">
                    {exitEndsRoom ? <Power size={16} /> : <LogOut size={16} />}
                    {exitLabel}
                </button>
            </div>
        </header>
    );
}

export default Header;
