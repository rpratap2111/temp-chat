import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const readSavedTheme = () => {
    try {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
    } catch {
        // localStorage can be unavailable (private mode, blocked storage).
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Theme toggle. Positioned top-right by default; pass `className` to place it inline.
function Mode({ className = 'absolute top-4 right-4' }) {
    const [isDark, setIsDark] = useState(readSavedTheme);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        try {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        } catch {
            // Ignore storage failures; the theme still applies for this page load.
        }
    }, [isDark]);

    return (
        <button
            onClick={() => setIsDark((dark) => !dark)}
            className={`btn btn-ghost btn-icon ${className}`}
            title="Toggle theme"
            aria-label="Toggle theme"
        >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
    );
}

export default Mode;
