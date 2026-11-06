import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Simple centred dialog. Closes on Escape or a click on the backdrop.
function Modal({ title, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-notice-in"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div role="dialog" aria-modal="true" aria-label={title}
                className="w-full max-w-md max-h-full overflow-y-auto custom-scrollbar rounded-2xl bg-surface border border-line animate-fadein">
                <div className="flex items-center justify-between h-14 pl-5 pr-3 border-b border-line">
                    <h2 className="text-base font-medium text-ink">{title}</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

export default Modal;
