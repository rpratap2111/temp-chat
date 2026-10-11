import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, KeyRound, Share2 } from 'lucide-react';
import { WhatsAppIcon, TelegramIcon } from './BrandIcons';
import Modal from './Modal';
import { useSocket } from '../context/SocketContext';
import { buildInviteLink } from '../lib/invite';
import {
    inviteMessage, whatsappShareUrl, telegramShareUrl, canNativeShare, isTouchDevice,
} from '../lib/share';

const SHARE_BUTTON = 'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition hover:brightness-110 active:scale-95';

function InviteModal({ session, requiresPassword, onClose }) {
    const { room } = useSocket();
    const link = buildInviteLink(session);
    const [qr, setQr] = useState('');
    const [copied, setCopied] = useState(false);

    const minutesLeft = room?.expiresAt
        ? Math.max(0, Math.round((new Date(room.expiresAt) - Date.now()) / 60000))
        : 0;
    const message = inviteMessage(minutesLeft);
    const showNativeShare = canNativeShare();

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

    // Opens the app (phones) or its web share page (desktop) with the invite filled in.
    const openShare = (url) => {
        if (isTouchDevice()) window.location.href = url;
        else window.open(url, '_blank', 'noopener,noreferrer');
    };

    // The phone's own share sheet: any app, and the link never leaves the device.
    const nativeShare = async () => {
        try {
            await navigator.share({ title: 'Temp Chat invite', text: message, url: link });
        } catch {
            // Cancelled by the user, or not allowed here.
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
                    <button onClick={() => openShare(whatsappShareUrl(message, link))}
                        className={`${SHARE_BUTTON} bg-[#25D366]`} aria-label="Share to WhatsApp">
                        <WhatsAppIcon size={19} /> WhatsApp
                    </button>
                    <button onClick={() => openShare(telegramShareUrl(message, link))}
                        className={`${SHARE_BUTTON} bg-[#229ED9]`} aria-label="Share to Telegram">
                        <TelegramIcon size={19} /> Telegram
                    </button>
                    {showNativeShare && (
                        <button onClick={nativeShare}
                            className={`${SHARE_BUTTON} flex-none bg-gray-700 dark:bg-gray-600`} aria-label="More ways to share">
                            <Share2 size={17} /> More
                        </button>
                    )}
                </div>

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
                        {requiresPassword && ' They will also need the room password, so send it separately.'}
                        {' '}Regular Telegram chats aren't end-to-end encrypted, so Telegram can see links posted there.
                    </span>
                </p>
            </div>
        </Modal>
    );
}

export default InviteModal;
