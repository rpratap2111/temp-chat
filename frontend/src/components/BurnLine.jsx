import React, { useLayoutEffect, useRef } from 'react';

const BURN_FRAMES = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }];

// A line that burns down from `startsAt` to `endsAt`, showing the room's
// lifetime under the header. The browser runs it as a single animation, so
// nothing re-renders while it burns. Its start time is pinned to the clock, so
// it stays correct in a tab that opened in the background.
function BurnLine({ startsAt, endsAt, className = '' }) {
    const lineRef = useRef(null);
    const start = new Date(startsAt).getTime();
    const total = new Date(endsAt).getTime() - start;
    const burns = total > 0;

    useLayoutEffect(() => {
        if (!burns) return undefined;
        const animation = lineRef.current.animate(BURN_FRAMES, { duration: total, fill: 'forwards' });
        animation.startTime = performance.now() - (Date.now() - start);
        return () => animation.cancel();
    }, [burns, start, total]);

    if (!burns) return null;

    return (
        <span className={`block overflow-hidden ${className}`} aria-hidden="true">
            <span ref={lineRef} className="block h-full bg-accent origin-left" />
        </span>
    );
}

export default BurnLine;
