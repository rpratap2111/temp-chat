import React, { useState } from 'react';
import {
    Pin, PinOff, Trash2, Flame, Download, Paperclip, Reply,
    Check, CheckCheck, Clock, AlertCircle, X, ShieldCheck,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { AVATAR_COLORS, NAME_COLORS, colorIndex } from '../lib/colors';

// Messages from the same person within this window share one run: one name,
// one avatar, one tail.
const GROUP_WINDOW_MS = 3 * 60 * 1000;


const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const burnLabel = (burnAt, timeStamp) => {
    const seconds = Math.round((new Date(burnAt) - new Date(timeStamp)) / 1000);
    return seconds >= 60 ? `${Math.round(seconds / 60)}m` : `${seconds}s`;
};

const HIGHLIGHT_CLASSES = ['ring-4', 'ring-indigo-400/70'];

// Scrolls to a message and flashes it, for clicks on a reply's quote.
function jumpToMessage(id) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(...HIGHLIGHT_CLASSES);
    setTimeout(() => el.classList.remove(...HIGHLIGHT_CLASSES), 1500);
}

// WhatsApp-style status: clock while sending, one grey tick once the server
// has it, two grey ticks once everyone received it, two blue ticks once
// everyone read it. Keyed on the status so each change pops.
const TICKS = {
    sending: { Icon: Clock, className: 'text-white/60', label: 'Sending' },
    sent: { Icon: Check, className: 'text-white/60', label: 'Sent' },
    delivered: { Icon: CheckCheck, className: 'text-white/60', label: 'Delivered to everyone' },
    read: { Icon: CheckCheck, className: 'text-cyan-300 drop-shadow-[0_0_3px_rgba(103,232,249,0.6)]', label: 'Read by everyone' },
    failed: { Icon: AlertCircle, className: 'text-red-200', label: 'Not sent' },
};

function StatusTicks({ status }) {
    const tick = TICKS[status] || TICKS.sent;
    const { Icon } = tick;
    return (
        <span key={status} className={`inline-flex animate-tick-pop ${tick.className}`} title={tick.label} aria-label={tick.label}>
            <Icon size={15} strokeWidth={2.5} />
        </span>
    );
}

function Attachment({ file, isSelf }) {
    if (file.isImage) {
        return (
            <a href={file.url} download={file.name} title={`Download ${file.name}`} className="block -mx-1.5 -mt-0.5 mb-1">
                <img src={file.url} alt={file.name} className="max-h-72 w-full rounded-xl object-cover" />
            </a>
        );
    }
    return (
        <a
            href={file.url}
            download={file.name}
            className={`mb-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isSelf
                ? 'bg-white/15 hover:bg-white/25'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15'}`}
        >
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${isSelf ? 'bg-white/20' : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'}`}>
                <Paperclip size={16} />
            </span>
            <span className="truncate font-medium">{file.name}</span>
            <Download size={16} className="ml-auto flex-shrink-0 opacity-80" />
        </a>
    );
}

// The quoted message shown at the top of a reply.
function ReplyQuote({ replyTo, isSelf, exists }) {
    const nameColor = isSelf ? 'text-white' : NAME_COLORS[colorIndex(replyTo.username)];
    const className = `block w-full text-left mb-1.5 px-2.5 py-1.5 rounded-lg border-l-4 text-xs ${isSelf
        ? 'bg-black/15 border-white/70'
        : 'bg-slate-100 dark:bg-black/20 border-indigo-500'}`;
    const body = (
        <>
            <div className={`font-semibold ${nameColor}`}>{replyTo.username}</div>
            <div className="truncate opacity-80">{exists ? replyTo.snippet : 'Message no longer available'}</div>
        </>
    );
    if (!exists) return <div className={`${className} italic`}>{body}</div>;
    return (
        <button type="button" onClick={() => jumpToMessage(replyTo.id)} className={`${className} hover:brightness-110`}
            title="Go to the original message">
            {body}
        </button>
    );
}

// Small floating toolbar beside a bubble.
function Actions({ msg, isSelf, canDelete, onReply, onPin, onDelete, visible }) {
    const btn = 'p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 transition';
    return (
        <div className={`self-center flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md border border-black/5 dark:border-white/10 transition-all duration-150
            ${isSelf ? 'mr-1' : 'ml-1'}
            ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none sm:group-hover:opacity-100 sm:group-hover:scale-100 sm:group-hover:pointer-events-auto'}`}>
            <button onClick={() => onReply(msg)} className={btn} aria-label="Reply to message" title="Reply">
                <Reply size={15} />
            </button>
            <button onClick={() => onPin(msg.id, !msg.pinned)} className={`${btn} ${msg.pinned ? 'text-amber-500' : ''}`}
                aria-label={msg.pinned ? 'Unpin message' : 'Pin message to keep it'}
                title={msg.pinned ? 'Unpin' : 'Pin to keep when the room closes'}>
                {msg.pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
            {canDelete && (
                <button onClick={() => onDelete(msg.id)} className={`${btn} hover:!text-red-600`} aria-label="Delete message" title="Delete for everyone">
                    <Trash2 size={15} />
                </button>
            )}
        </div>
    );
}

function MessageList({ messages, onReply, replyingToId }) {
    const { me, deleteMessage, setPinned, discardMessage } = useSocket();
    // On touch screens a tap shows a message's actions (there is no hover).
    const [activeId, setActiveId] = useState(null);
    const liveIds = new Set(messages.map((m) => m.id));
    const hasUserMessages = messages.some((m) => m.messageType === 'user');

    // Double-clicking anywhere on a message's row, including the empty space
    // beside the bubble, picks it as the reply target. Double-clicks on the
    // row's own buttons and links keep their normal behaviour.
    const handleDoubleClick = (event, msg) => {
        if (event.target.closest('button, a')) return;
        window.getSelection()?.removeAllRanges();
        onReply(msg);
    };

    const handleTap = (event, msg) => {
        if (event.target.closest('button, a')) return;
        if (window.matchMedia('(hover: none)').matches) {
            setActiveId((current) => (current === msg.id ? null : msg.id));
        }
    };

    return (
        <>
            {!hasUserMessages && (
                <div className="flex flex-col items-center justify-center text-center py-10 px-6 animate-notice-in">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                        <ShieldCheck size={28} />
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">Say hi 👋</div>
                    <div className="mt-1 max-w-xs text-sm text-slate-600 dark:text-slate-400">
                        Messages are end-to-end encrypted. Only people with the invite link can read them.
                    </div>
                </div>
            )}

            {messages.map((msg, index) => {
                const key = msg.clientId || msg.id;

                if (msg.messageType === 'system') {
                    return (
                        <div key={key} className={`flex justify-center my-2 ${msg.isNew ? 'animate-notice-in' : ''}`}>
                            <div className="px-3 py-1 rounded-lg text-xs font-medium bg-white/80 text-slate-600 shadow-sm dark:bg-slate-800/80 dark:text-slate-300">
                                {msg.text}
                            </div>
                        </div>
                    );
                }

                const prev = messages[index - 1];
                const startsRun = !prev
                    || prev.messageType !== 'user'
                    || prev.username !== msg.username
                    || new Date(msg.timeStamp) - new Date(prev.timeStamp) > GROUP_WINDOW_MS;

                const isSelf = msg.username === me?.username;
                const isPending = msg.status === 'sending' || msg.status === 'failed';
                const canAct = !msg.undecryptable && !isPending;
                const canDelete = isSelf || me?.isHost;
                const isReplyTarget = msg.id === replyingToId;
                const color = colorIndex(msg.username);
                const imageOnly = msg.file?.isImage && !msg.text && !msg.replyTo;

                const bubbleColor = isSelf
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-50';
                const corners = startsRun
                    ? (isSelf ? 'rounded-2xl rounded-tr-none' : 'rounded-2xl rounded-tl-none')
                    : 'rounded-2xl';
                const tail = startsRun ? (isSelf ? 'bubble-tail-right' : 'bubble-tail-left') : '';
                const animation = msg.isNew ? (isSelf ? 'animate-msg-in-right' : 'animate-msg-in-left') : '';

                return (
                    <div
                        key={key}
                        onDoubleClick={canAct ? (e) => handleDoubleClick(e, msg) : undefined}
                        onClick={canAct ? (e) => handleTap(e, msg) : undefined}
                        title={canAct ? 'Double-click to reply' : undefined}
                        className={`group flex items-end gap-2 -mx-2 px-2 rounded-xl transition-colors
                            ${startsRun ? 'mt-3' : 'mt-0.5'}
                            ${isSelf ? 'flex-row-reverse' : ''}
                            ${isReplyTarget ? 'bg-indigo-500/15' : canAct ? 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]' : ''}`}
                    >
                        {!isSelf && (
                            <div className="w-8 flex-shrink-0 self-start">
                                {startsRun && (
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white shadow ${AVATAR_COLORS[color]}`}>
                                        {msg.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        )}

                        <div
                            id={`msg-${msg.id}`}
                            className={`relative max-w-[78%] sm:max-w-md shadow-sm transition-shadow ${bubbleColor} ${corners} ${tail} ${animation}
                                ${imageOnly ? 'p-1.5' : 'px-3 pt-2 pb-1.5'}
                                ${msg.pinned ? 'ring-2 ring-amber-400' : ''}
                                ${msg.status === 'failed' ? 'opacity-80' : ''}`}
                        >
                            {!isSelf && startsRun && !imageOnly && (
                                <div className={`text-xs font-semibold mb-0.5 ${NAME_COLORS[color]}`}>{msg.username}</div>
                            )}

                            {msg.undecryptable ? (
                                <div className="italic text-sm opacity-80">
                                    This message can't be decrypted. The invite link you used may have the wrong key.
                                </div>
                            ) : (
                                <>
                                    {msg.replyTo && (
                                        <ReplyQuote replyTo={msg.replyTo} isSelf={isSelf} exists={liveIds.has(msg.replyTo.id)} />
                                    )}
                                    {msg.file && <Attachment file={msg.file} isSelf={isSelf} />}
                                    {msg.text && (
                                        <span className="break-words whitespace-pre-wrap text-[15px] leading-snug">{msg.text}</span>
                                    )}
                                </>
                            )}

                            {/* Time, burn timer and ticks sit on the last line, WhatsApp style. */}
                            <span className={`float-right ml-2 mt-1 flex items-center gap-1 text-[11px] leading-none select-none
                                ${imageOnly ? 'absolute bottom-3 right-3 rounded-full bg-black/45 px-2 py-1 text-white' : ''}
                                ${!imageOnly && (isSelf ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400')}`}>
                                {msg.pinned && <Pin size={11} aria-label="Pinned" />}
                                {msg.burnAt && (
                                    <span className="inline-flex items-center gap-0.5" title="This message will disappear for everyone">
                                        <Flame size={11} /> {burnLabel(msg.burnAt, msg.timeStamp)}
                                    </span>
                                )}
                                {formatTime(msg.timeStamp)}
                                {isSelf && <StatusTicks status={msg.status} />}
                            </span>
                            <span className="block clear-both" />
                        </div>

                        {canAct && (
                            <Actions
                                msg={msg}
                                isSelf={isSelf}
                                canDelete={canDelete}
                                onReply={onReply}
                                onPin={setPinned}
                                onDelete={deleteMessage}
                                visible={activeId === msg.id}
                            />
                        )}

                        {msg.status === 'failed' && (
                            <div className="self-center flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                Not sent
                                <button onClick={() => discardMessage(msg.clientId)} aria-label="Dismiss failed message"
                                    className="p-1 rounded-full hover:bg-red-500/10">
                                    <X size={13} />
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}

export default MessageList;
