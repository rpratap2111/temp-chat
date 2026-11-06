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
                    <div className="rounded-xl border border-line overflow-hidden">
                        <button
                            onClick={() => onLeave(newHost || undefined)}
                            className="w-full flex items-start gap-3 p-4 text-left hover:bg-raised transition-colors"
                        >
                            <LogOut size={16} className="mt-0.5 text-ink-2" />
                            <span>
                                <span className="block text-sm font-medium text-ink">
                                    {newHost ? `Leave and make ${newHost} host` : 'Leave'}
                                </span>
                                <span className="block text-sm text-ink-2">{leaveText}</span>
                            </span>
                        </button>

                        {candidates.length > 0 && (
                            <label className="flex items-center gap-2 px-4 py-2 text-sm border-t border-line text-ink-2">
                                <Crown size={16} />
                                <span className="flex-shrink-0">New host</span>
                                <select
                                    value={newHost}
                                    onChange={(e) => setNewHost(e.target.value)}
                                    className="field h-9 ml-auto min-w-0 w-auto max-w-[60%]"
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
                    className="w-full flex items-start gap-3 p-4 rounded-xl text-left border border-line hover:bg-negative-soft transition-colors"
                >
                    <Power size={16} className="mt-0.5 text-negative" />
                    <span>
                        <span className="block text-sm font-medium text-negative">End room for everyone</span>
                        <span className="block text-sm text-ink-2">
                            Closes the chat now and deletes every message. Everyone sees the pinned takeaway.
                        </span>
                    </span>
                </button>

                {!canLeave && (
                    <p className="text-xs text-center text-ink-3">
                        Nobody else is online to take over as host, so leaving would end the room
                    </p>
                )}

                <button onClick={onClose} className="btn btn-ghost w-full">
                    Cancel
                </button>
            </div>
        </Modal>
    );
}

export default LeaveDialog;
