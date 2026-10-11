import React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import Modal from './Modal';
import Countdown from './Countdown';
import { useSocket } from '../context/SocketContext';
import { SLOW_MODE_OPTIONS, EXTEND_OPTIONS_MINUTES, END_POLICY_OPTIONS } from '../config';

const SECTION = 'space-y-2';
const HEADING = 'text-sm font-semibold text-gray-700 dark:text-gray-200';
const NOTE = 'text-xs text-gray-500 dark:text-gray-400';

function HostPanel({ onClose }) {
    const { room, updateSettings, extendRoom, closeRoom } = useSocket();
    if (!room) return null;

    const policy = END_POLICY_OPTIONS.find((o) => o.value === room.endPolicy);

    const handleClose = () => {
        if (window.confirm('Close the room for everyone? All messages will be deleted.')) {
            closeRoom();
            onClose();
        }
    };

    return (
        <Modal title="Host controls" onClose={onClose}>
            <div className="space-y-6">
                <div className={SECTION}>
                    <div className={HEADING}>Access</div>
                    <button
                        onClick={() => updateSettings({ locked: !room.locked })}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-white ${room.locked ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-600 hover:bg-gray-700'}`}
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
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
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
                                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
                                +{minutes >= 60 ? `${minutes / 60} hour` : `${minutes} min`}
                            </button>
                        ))}
                    </div>
                    <p className={NOTE}>
                        A room can last at most 24 hours from when it was created.
                        {policy && ` It also closes: ${policy.label.toLowerCase()}.`}
                    </p>
                </div>

                <button
                    onClick={handleClose}
                    className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                    Close room for everyone
                </button>
            </div>
        </Modal>
    );
}

export default HostPanel;
