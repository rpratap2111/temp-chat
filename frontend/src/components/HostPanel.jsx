import React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import Modal from './Modal';
import Countdown from './Countdown';
import { useSocket } from '../context/SocketContext';
import { SLOW_MODE_OPTIONS, EXTEND_OPTIONS_MINUTES, END_POLICY_OPTIONS } from '../config';

const SECTION = 'space-y-2';
const HEADING = 'text-sm font-medium text-ink';
const NOTE = 'text-xs leading-5 text-ink-3';

function HostPanel({ onClose }) {
    const { room, updateSettings, extendRoom } = useSocket();
    if (!room) return null;

    const policy = END_POLICY_OPTIONS.find((o) => o.value === room.endPolicy);

    return (
        <Modal title="Host controls" onClose={onClose}>
            <div className="space-y-6">
                <div className={SECTION}>
                    <div className={HEADING}>Access</div>
                    <button
                        onClick={() => updateSettings({ locked: !room.locked })}
                        className="btn btn-secondary w-full"
                    >
                        {room.locked ? <LockOpen size={16} /> : <Lock size={16} />}
                        {room.locked ? 'Unlock room' : 'Lock room'}
                    </button>
                    <p className={NOTE}>
                        {room.locked
                            ? 'The room is locked. Nobody new can join, even with the link.'
                            : 'Locking stops new people from joining. People already here can stay and reconnect.'}
                    </p>
                </div>

                <div className={SECTION}>
                    <label className={HEADING} htmlFor="slowMode">Slow mode</label>
                    <select
                        id="slowMode"
                        value={room.slowModeSeconds}
                        onChange={(e) => updateSettings({ slowModeSeconds: Number(e.target.value) })}
                        className="field h-9"
                    >
                        {SLOW_MODE_OPTIONS.map((o) => (
                            <option key={o.seconds} value={o.seconds}>{o.label}</option>
                        ))}
                    </select>
                    <p className={NOTE}>Limits how often each person can send a message. It doesn't apply to you.</p>
                </div>

                <div className={SECTION}>
                    <div className={`${HEADING} flex items-center gap-2`}>
                        Time left <Countdown expiresAt={room.expiresAt} />
                    </div>
                    <div className="flex gap-2">
                        {EXTEND_OPTIONS_MINUTES.map((minutes) => (
                            <button key={minutes}
                                onClick={() => extendRoom(minutes)}
                                className="btn btn-secondary flex-1">
                                +{minutes >= 60 ? `${minutes / 60} hour` : `${minutes} min`}
                            </button>
                        ))}
                    </div>
                    <p className={NOTE}>
                        A room can last at most 24 hours from when it was created.
                        {policy && ` It also closes: ${policy.label.toLowerCase()}.`}
                    </p>
                </div>
                <p className={NOTE}>To end the room for everyone, use Leave or End room</p>
            </div>
        </Modal>
    );
}

export default HostPanel;
