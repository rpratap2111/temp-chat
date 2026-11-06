import React, { useEffect, useState } from 'react';
import {
    Pin, PinOff, Trash2, Flame, Download, Paperclip, Reply,
    Check, CheckCheck, Clock, AlertCircle, X, ShieldCheck, Crown,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { NAME_COLORS, colorIndex } from '../lib/colors';
import Avatar from './Avatar';
import { formatRemaining } from './Countdown';

// Messages from the same person within this window share one run: one name,
// one avatar, one tail.
const GROUP_WINDOW_MS = 3 * 60 * 1000;


// System notices are written by the server for everyone. A few read better
// in the second person for the person they are about.
function personalizeNotice(text, myName) {
    if (myName && text === `${myName} is now the host.`) return 'You are now the host';
    return text;
}

const isHostNoticeFor = (text, myName) => !!myName && text === `${myName} is now the host.`;

const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Time left on a self-destructing message, counting down live.
function BurnCountdown({ burnAt, className = '' }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const remaining = Math.max(0, new Date(burnAt).getTime() - now);
    const label = remaining < 60000 ? `${Math.ceil(remaining / 1000)}s` : formatRemaining(remaining);

    return (
        <span className={`inline-flex items-center gap-1 ${className}`} title="This message will disappear for everyone">
            <Flame size={12} /> {label}
        </span>
    );
}

const HIGHLIGHT_CLASSES = ['ring-2', 'ring-accent'];

// Scrolls to a message and flashes it, for clicks on a reply's quote.
function jumpToMessage(id) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(...HIGHLIGHT_CLASSES);
    setTimeout(() => el.classList.remove(...HIGHLIGHT_CLASSES), 1500);
}

// WhatsApp-style status: clock while sending, one tick once the server has it,
// two ticks once everyone received it, two ember ticks once everyone read it.
const TICKS = {
    sending: { Icon: Clock, className: '', label: 'Sending' },
    sent: { Icon: Check, className: '', label: 'Sent' },
    delivered: { Icon: CheckCheck, className: '', label: 'Delivered to everyone' },
    read: { Icon: CheckCheck, className: 'text-accent', label: 'Read by everyone' },
    failed: { Icon: AlertCircle, className: 'text-negative', label: 'Not sent' },
};

function StatusTicks({ status }) {
    const tick = TICKS[status] || TICKS.sent;
    const { Icon } = tick;
    return (
        <span key={status} className={`inline-flex animate-notice-in ${tick.className}`} title={tick.label} aria-label={tick.label}>
            <Icon size={12} />
        </span>
    );
}

function Attachment({ file, isSelf }) {
    if (file.isImage) {
        return (
            <a href={file.url} download={file.name} title={`Download ${file.name}`} className="block -mx-1.5 -mt-0.5 mb-1">
                <img src={file.url} alt={file.name} className="max-h-72 w-full rounded-lg object-cover" />
            </a>
        );
    }
    return (
        <a
            href={file.url}
            download={file.name}
            className={`mb-1 flex items-center gap-2 h-10 px-3 rounded-lg text-sm border border-line hover:border-line-strong transition-colors ${isSelf ? 'bg-surface' : 'bg-raised'}`}
        >
            <Paperclip size={16} className="text-ink-3" />
            <span className="truncate">{file.name}</span>
            <Download size={16} className="ml-auto text-ink-3" />
        </a>
    );
}

// The quoted message shown at the top of a reply.
function ReplyQuote({ replyTo, isSelf, exists }) {
    const nameColor = NAME_COLORS[colorIndex(replyTo.username)];
    const className = `block w-full text-left mb-1 px-2 py-1 rounded-md border-l-2 border-line-strong text-xs ${isSelf ? 'bg-surface' : 'bg-raised'}`;
    const body = (
        <>
            <div className={`font-medium ${nameColor}`}>{replyTo.username}</div>
            <div className="truncate text-ink-2">{exists ? replyTo.snippet : 'Message no longer available'}</div>
        </>
    );
    if (!exists) return <div className={className}>{body}</div>;
    return (
        <button type="button" onClick={() => jumpToMessage(replyTo.id)} className={className}
            title="Go to the original message">
            {body}
        </button>
    );
}

// Small floating toolbar beside a bubble.
function Actions({ msg, isSelf, canDelete, onReply, onPin, onDelete, visible }) {
    return (
        <div className={`menu-panel self-center flex items-center p-0.5 rounded-lg transition-opacity
            ${isSelf ? 'mr-1' : 'ml-1'}
            ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto'}`}>
            <button onClick={() => onReply(msg)} className="btn-icon-sm" aria-label="Reply to message" title="Reply">
                <Reply size={16} />
            </button>
            <button onClick={() => onPin(msg.id, !msg.pinned)} className="btn-icon-sm"
                aria-label={msg.pinned ? 'Unpin message' : 'Pin message to keep it'}
                title={msg.pinned ? 'Unpin' : 'Pin to keep when the room closes'}>
                {msg.pinned ? <PinOff size={16} /> : <Pin size={16} />}
            </button>
            {canDelete && (
                <button onClick={() => onDelete(msg.id)} className="btn-icon-sm hover:text-negative" aria-label="Delete message" title="Delete for everyone">
                    <Trash2 size={16} />
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
                <div className="flex flex-col items-center text-center py-12 px-6 animate-notice-in">
                    <ShieldCheck size={16} className="mb-2 text-ink-3" />
                    <div className="text-base font-medium text-ink">Say hi</div>
                    <div className="mt-1 max-w-xs text-sm text-ink-2">
                        Messages are end-to-end encrypted. Only people with the invite link can read them.
                    </div>
                </div>
            )}

            {messages.map((msg, index) => {
                const key = msg.clientId || msg.id;

                if (msg.messageType === 'system') {
                    return (
                        <div key={key} className={`flex justify-center my-3 ${msg.isNew ? 'animate-notice-in' : ''}`}>
                            <div className={`inline-flex items-center gap-1 text-xs ${isHostNoticeFor(msg.text, me?.username) ? 'text-ink' : 'text-ink-3'}`}>
                                {isHostNoticeFor(msg.text, me?.username) && <Crown size={12} aria-hidden="true" />}
                                {personalizeNotice(msg.text, me?.username)}
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
                const nameColor = NAME_COLORS[colorIndex(msg.username)];
                const imageOnly = msg.file?.isImage && !msg.text && !msg.replyTo;

                const bubbleColor = isSelf
                    ? 'bg-bubble-self border-transparent'
                    : 'bg-surface border-line';
                const corners = startsRun
                    ? (isSelf ? 'rounded-xl rounded-tr-sm' : 'rounded-xl rounded-tl-sm')
                    : 'rounded-xl';
                const animation = msg.isNew ? 'animate-msg-in' : '';

                return (
                    <div
                        key={key}
                        onDoubleClick={canAct ? (e) => handleDoubleClick(e, msg) : undefined}
                        onClick={canAct ? (e) => handleTap(e, msg) : undefined}
                        title={canAct ? 'Double-click to reply' : undefined}
                        className={`group flex items-end gap-2 -mx-2 px-2 rounded-lg transition-colors
                            ${startsRun ? 'mt-3' : 'mt-0.5'}
                            ${isSelf ? 'flex-row-reverse' : ''}
                            ${isReplyTarget ? 'bg-accent-soft' : canAct ? 'hover:bg-ink/[0.03]' : ''}`}
                    >
                        {!isSelf && (
                            <div className="w-8 flex-shrink-0 self-start">
                                {startsRun && <Avatar name={msg.username} />}
                            </div>
                        )}

                        <div
                            id={`msg-${msg.id}`}
                            className={`relative max-w-[78%] sm:max-w-md border text-ink ${bubbleColor} ${corners} ${animation}
                                ${imageOnly ? 'p-1.5' : 'px-3 pt-2 pb-2'}
                                ${msg.pinned ? 'ring-1 ring-line-strong' : ''}
                                ${msg.status === 'failed' ? 'opacity-80' : ''}`}
                        >
                            {!isSelf && startsRun && !imageOnly && (
                                <div className={`text-xs font-medium mb-0.5 ${nameColor}`}>{msg.username}</div>
                            )}

                            {msg.undecryptable ? (
                                <div className="text-sm text-ink-2">
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
                            <span className={`float-right ml-2 mt-1 flex items-center gap-1 font-mono text-xs leading-4 tabular-nums select-none
                                ${imageOnly ? 'absolute bottom-3 right-3 rounded-md bg-black/50 px-2 text-white' : 'text-ink-3'}`}>
                                {msg.pinned && <Pin size={12} aria-label="Pinned" />}
                                {msg.burnAt && <BurnCountdown burnAt={msg.burnAt} className={imageOnly ? '' : 'text-accent'} />}
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
                            <div className="self-center flex items-center gap-1 text-xs text-negative">
                                Not sent
                                <button onClick={() => discardMessage(msg.clientId)} aria-label="Dismiss failed message"
                                    className="btn-icon-sm">
                                    <X size={16} />
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
