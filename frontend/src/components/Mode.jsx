import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

function Mode() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setIsDark(prefersDark);
        document.documentElement.classList.toggle('dark', prefersDark);
    }, []);

    const toggleTheme = () => {
        const nextTheme = !isDark;
        setIsDark(nextTheme);
        document.documentElement.classList.toggle('dark', nextTheme);
        localStorage.setItem('theme', nextTheme ? 'dark' : 'light');
    };

    return (
        <div>
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 p-2 bg-white/40 dark:bg-black/30 rounded-full backdrop-blur-md shadow-md hover:scale-105 transition"
                title="Toggle Theme"
            >
                {isDark ? <Sun className="text-yellow-400" /> : <Moon className="text-gray-700" />}
            </button>
        </div>
    );
}

export default Mode;
