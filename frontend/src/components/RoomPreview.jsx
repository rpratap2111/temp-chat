import React from 'react';
import { CheckCheck, Flame } from 'lucide-react';
import Avatar from './Avatar';

// A still picture of a room for the home screen: the countdown, the line
// burning down under it, and a message on its way out.
function RoomPreview({ className = '' }) {
    return (
        <div className={`rounded-2xl border border-line bg-surface overflow-hidden select-none ${className}`} aria-hidden="true">
            <div className="flex items-center justify-between h-12 px-4">
                <span className="text-sm font-medium text-ink">
                    Room <span className="font-mono">K7M2QX9P</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-ink-2">41:12</span>
            </div>
            <div className="h-0.5 bg-line">
                <div className="h-full bg-accent origin-left" style={{ transform: 'scaleX(0.69)' }} />
            </div>

            <div className="p-4 space-y-2 bg-page">
                <div className="flex gap-2">
                    <Avatar name="Mara" />
                    <div className="max-w-[78%] rounded-xl rounded-tl-sm border border-line bg-surface px-3 pt-2 pb-2">
                        <div className="text-sm text-ink">Gate code is 4471, it changes tonight</div>
                        <div className="mt-1 flex items-center gap-1 font-mono text-xs text-accent">
                            <Flame size={12} /> 24s
                        </div>
                    </div>
                </div>
                <div className="flex justify-end">
                    <div className="max-w-[78%] rounded-xl rounded-tr-sm bg-bubble-self px-3 pt-2 pb-2">
                        <div className="text-sm text-ink">Got it, on my way</div>
                        <div className="mt-1 flex items-center justify-end gap-1 font-mono text-xs text-ink-3">
                            21:08 <CheckCheck size={12} className="text-accent" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RoomPreview;
