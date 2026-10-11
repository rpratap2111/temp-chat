import React from 'react';

// "Alice is typing", "Alice and Bob are typing", "3 people are typing".
function typingText(names) {
    if (names.length === 1) return `${names[0]} is typing`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
    return `${names.length} people are typing`;
}

// Three bouncing dots.
export function TypingDots({ size = 'md', className = '' }) {
    const dot = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';
    return (
        <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden="true">
            <span className={`typing-dot rounded-full bg-current ${dot}`} />
            <span className={`typing-dot rounded-full bg-current ${dot}`} />
            <span className={`typing-dot rounded-full bg-current ${dot}`} />
        </span>
    );
}

// "Alice is typing…" with the ellipsis dots appearing one after another.
export function TypingLabel({ names, className = '' }) {
    if (!names.length) return null;
    return (
        <span className={`inline-flex items-baseline animate-notice-in ${className}`} aria-live="polite">
            <span className="truncate">{typingText(names)}</span>
            <span className="typing-ellipsis" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
        </span>
    );
}
