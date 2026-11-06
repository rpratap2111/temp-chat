import React from 'react';
import { AVATAR_COLORS, colorIndex } from '../lib/colors';

// A person's initial, in the colour their name always has.
function Avatar({ name, className = '' }) {
    return (
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${AVATAR_COLORS[colorIndex(name)]} ${className}`}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

export default Avatar;
