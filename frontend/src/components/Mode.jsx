import React from 'react';
import { Sun, Moon } from 'lucide-react';

const REVEAL_MS = 450;
// Unlike the app's ease-out, this keeps its speed to the end. The last thing the
// circle reaches is the far corner, and slowing there looks like it has stuck.
const REVEAL_EASING = 'cubic-bezier(0.4, 0, 0.9, 0.8)';

function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
        // Ignore storage failures; the theme still applies for this page load.
    }
}

// The new theme spreads out in a circle from the button that was pressed.
function revealTheme(isDark, button) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reducedMotion) {
        applyTheme(isDark);
        return;
    }

    const { left, top, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    // Far enough to reach the corner of the window furthest from the button.
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const root = document.documentElement;
    const transition = document.startViewTransition(() => {
        // Controls fade their own colours, which would lag behind the reveal.
        root.classList.add('theme-switching');
        applyTheme(isDark);
    });
    transition.finished.finally(() => root.classList.remove('theme-switching'));
    transition.ready
        .then(() => {
            root.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                { duration: REVEAL_MS, easing: REVEAL_EASING, pseudoElement: '::view-transition-new(root)' },
            );
        })
        .catch(() => {
            // Skipped, e.g. the tab is hidden. The theme has still changed.
        });
}

// Theme toggle. Positioned top-right by default; pass `className` to place it inline.
// The theme lives on <html>, set before first paint in index.html, so every
// toggle on the page always agrees.
function Mode({ className = 'absolute top-4 right-4' }) {
    const toggle = (event) => {
        revealTheme(!document.documentElement.classList.contains('dark'), event.currentTarget);
    };

    return (
        <button
            onClick={toggle}
            className={`btn btn-ghost btn-icon ${className}`}
            title="Toggle theme"
            aria-label="Toggle theme"
        >
            <Sun size={16} className="hidden dark:block" />
            <Moon size={16} className="dark:hidden" />
        </button>
    );
}

export default Mode;
