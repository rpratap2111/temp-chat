import React, { useState } from 'react';
import { LogOut, Power, Crown } from 'lucide-react';
import Modal from './Modal';

// What happens to the room after the host steps out without handing over.
const AFTER_LEAVING = {
    everyone_leaves: 'The room stays open and closes once everyone else has left, or when the timer runs out.',
    timer_only: "The room stays open for the others until its timer runs out. You won't be host if you come back.",
};

// The host's exit choices, in the style of "Leave meeting / End meeting for all".
//
// `candidates` are the other people online who could take over as host.
// In a room that closes when the host leaves, leaving is only possible by
// handing over; with nobody to hand over to, only "End room" is offered.
function LeaveDialog({ endPolicy, candidates, onLeave, onEnd, onClose }) {
    const mustHandOver = endPolicy === 'host_leaves';
    const [newHost, setNewHost] = useState(mustHandOver ? (candidates[0] || '') : '');
    const canLeave = !mustHandOver || candidates.length > 0;

    let leaveText = AFTER_LEAVING[endPolicy];
    if (newHost) leaveText = `You leave and ${newHost} becomes the host. The chat carries on.`;

    return (
        <Modal title={canLeave ? 'Leave or end the room?' : 'End the room?'} onClose={onClose}>
            <div className="space-y-3">
                {canLeave && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button
                            onClick={() => onLeave(newHost || undefined)}
                            className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                        >
                            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                <LogOut size={18} />
                            </span>
                            <span>
                                <span className="block font-semibold text-gray-900 dark:text-white">
                                    {newHost ? `Leave and make ${newHost} host` : 'Leave'}
                                </span>
                                <span className="block text-sm text-gray-600 dark:text-gray-300">{leaveText}</span>
                            </span>
                        </button>

                        {candidates.length > 0 && (
                            <label className="flex items-center gap-2 px-4 py-2.5 text-sm border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200">
                                <Crown size={15} className="text-amber-500 flex-shrink-0" />
                                <span className="flex-shrink-0">New host</span>
                                <select
                                    value={newHost}
                                    onChange={(e) => setNewHost(e.target.value)}
                                    className="ml-auto min-w-0 max-w-[60%] px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                    aria-label="Who becomes host"
                                >
                                    {!mustHandOver && <option value="">No one</option>}
                                    {candidates.map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </div>
                )}

                <button
                    onClick={onEnd}
                    className="w-full flex items-start gap-3 p-4 rounded-xl text-left border border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition"
                >
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                        <Power size={18} />
                    </span>
                    <span>
                        <span className="block font-semibold text-red-700 dark:text-red-300">End room for everyone</span>
                        <span className="block text-sm text-red-700/80 dark:text-red-200/80">
                            Closes the chat now and deletes every message. Everyone sees the pinned takeaway.
                        </span>
                    </span>
                </button>

                {!canLeave && (
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        Nobody else is online to take over as host, so leaving would end the room.
                    </p>
                )}

                <button onClick={onClose}
                    className="w-full py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                    Cancel
                </button>
            </div>
        </Modal>
    );
}

export default LeaveDialog;
