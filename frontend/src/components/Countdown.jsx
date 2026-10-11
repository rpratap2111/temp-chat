import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');

// "4:05", "1:02:09", or "0:00" once time is up.
// eslint-disable-next-line react-refresh/only-export-components
export function formatRemaining(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

const WARNING_MS = 2 * 60 * 1000;

// Live countdown to the room's expiry.
function Countdown({ expiresAt }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!expiresAt) return null;
    const remaining = new Date(expiresAt).getTime() - now;
    const urgent = remaining < WARNING_MS;

    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full tabular-nums ${urgent
                ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                : 'bg-white/60 text-gray-700 dark:bg-white/10 dark:text-gray-200'}`}
            title="Time until this room and its messages are deleted"
        >
            <Timer size={12} />
            {formatRemaining(remaining)}
        </span>
    );
}

export default Countdown;
