import React from 'react';

// "Alice is typing", "Alice and Bob are typing", "3 people are typing".
function typingText(names) {
    if (names.length === 1) return `${names[0]} is typing`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
    return `${names.length} people are typing`;
}

// Three dots that light up in turn.
export function TypingDots({ className = '' }) {
    const dot = 'typing-dot h-1 w-1 rounded-full bg-current';
    return (
        <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden="true">
            <span className={dot} />
            <span className={dot} />
            <span className={dot} />
        </span>
    );
}

export function TypingLabel({ names, className = '' }) {
    if (!names.length) return null;
    return (
        <span className={`truncate ${className}`} aria-live="polite">{typingText(names)}</span>
    );
}
