import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, KeyRound } from 'lucide-react';
import Modal from './Modal';
import { buildInviteLink } from '../lib/invite';

function InviteModal({ session, requiresPassword, onClose }) {
    const link = buildInviteLink(session);
    const [qr, setQr] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        QRCode.toDataURL(link, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
            .then((url) => { if (!cancelled) setQr(url); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [link]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable; the link is selectable below.
        }
    };

    return (
        <Modal title="Invite people" onClose={onClose}>
            <div className="space-y-4">
                {qr && (
                    <img src={qr} alt="QR code for the invite link" width={220} height={220}
                        className="mx-auto rounded-lg bg-white p-2" />
                )}

                <div className="flex gap-2">
                    <input
                        readOnly
                        value={link}
                        onFocus={(e) => e.target.select()}
                        className="flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                        aria-label="Invite link"
                    />
                    <button onClick={copy}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 flex gap-2">
                    <KeyRound size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                        The link contains the room's encryption key. Anyone with it can read this chat,
                        so share it only with people you trust.
                        {requiresPassword && ' They will also need the room password.'}
                    </span>
                </p>
            </div>
        </Modal>
    );
}

export default InviteModal;
