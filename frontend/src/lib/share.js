// Share links for messaging apps.
//
// On phones the app schemes (whatsapp://, tg://) open the installed app
// directly, so the invite link (which carries the room key) stays on the
// device. On desktop there is no reliable app scheme, so the web share pages
// are used; those pass the link through WhatsApp's or Telegram's web servers.

export const isTouchDevice = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

export const canNativeShare = () =>
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export function inviteMessage(minutesLeft) {
    const when = minutesLeft > 0
        ? ` It closes in about ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`
        : '';
    return `Join my private Temp Chat room. Messages are end-to-end encrypted.${when}`;
}

export function whatsappShareUrl(text, link) {
    const body = encodeURIComponent(`${text}\n${link}`);
    return isTouchDevice() ? `whatsapp://send?text=${body}` : `https://api.whatsapp.com/send?text=${body}`;
}

export function telegramShareUrl(text, link) {
    const params = `url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    return isTouchDevice() ? `tg://msg_url?${params}` : `https://t.me/share/url?${params}`;
}
