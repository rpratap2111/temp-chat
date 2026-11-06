import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, Flame, X, Pin, ChevronDown, ChevronUp, Reply, ArrowDown } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { MESSAGE_MAX_LENGTH, MAX_FILE_BYTES, BURN_OPTIONS } from '../config';
import { replySnippet } from '../lib/reply';
import MessageList from './MessageList';
import { TypingDots, TypingLabel } from './Typing';
import Avatar from './Avatar';

const formatBytes = (bytes) => (bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

// Within this distance of the bottom, new messages scroll into view on their own.
const STICK_TO_BOTTOM_PX = 120;
// "Typing" is re-sent at most this often, and cleared after this much idle time.
const TYPING_RESEND_MS = 2500;
const TYPING_IDLE_MS = 3000;

// Messages, pinned bar and composer share one readable column.
const COLUMN = 'w-full max-w-3xl mx-auto px-4';

function ChatArea() {
    const {
        messages, users, me, room, isConnected, sendText, sendFile,
        markRead, typingUsers, setTyping,
    } = useSocket();
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState(null);
    const [burnIndex, setBurnIndex] = useState(0);
    const [sending, setSending] = useState(false);
    const [localError, setLocalError] = useState('');
    const [showPinned, setShowPinned] = useState(false);
    // The message being replied to, chosen by double-clicking it.
    const [replyTo, setReplyTo] = useState(null);
    const [atBottom, setAtBottom] = useState(true);
    const [unseenCount, setUnseenCount] = useState(0);

    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const lastCountRef = useRef(0);
    const typingSentAtRef = useRef(0);
    const typingIdleRef = useRef(null);

    const burn = BURN_OPTIONS[burnIndex];
    const isMuted = !!users.find((u) => u.username === me?.username)?.muted;
    const canSend = isConnected && !!me && !isMuted && !sending;
    const pinned = messages.filter((m) => m.pinned && !m.undecryptable);

    const isNearBottom = () => {
        const el = scrollRef.current;
        return !el || el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_PX;
    };

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior });
        setUnseenCount(0);
    }, []);

    // Follow new messages when already at the bottom or when it's your own;
    // otherwise count them on the "jump to latest" button.
    useLayoutEffect(() => {
        const added = messages.length - lastCountRef.current;
        const wasEmpty = lastCountRef.current === 0;
        lastCountRef.current = messages.length;
        if (added <= 0) return;

        const latest = messages[messages.length - 1];
        const mine = latest?.username === me?.username;
        if (wasEmpty || mine || atBottom) {
            scrollToBottom(wasEmpty ? 'auto' : 'smooth');
        } else {
            setUnseenCount((n) => n + added);
        }
    }, [messages, me, atBottom, scrollToBottom]);

    // Keep the typing indicator in view when it appears at the bottom.
    useEffect(() => {
        if (typingUsers.length && atBottom) scrollToBottom();
    }, [typingUsers.length, atBottom, scrollToBottom]);

    const handleScroll = () => {
        const near = isNearBottom();
        setAtBottom(near);
        if (near) setUnseenCount(0);
    };

    // Report messages as read while this tab is visible and focused.
    useEffect(() => {
        const report = () => {
            if (document.visibilityState === 'visible' && document.hasFocus()) markRead(messages);
        };
        report();
        window.addEventListener('focus', report);
        document.addEventListener('visibilitychange', report);
        return () => {
            window.removeEventListener('focus', report);
            document.removeEventListener('visibilitychange', report);
        };
    }, [messages, markRead]);

    // Drop the reply target if that message is deleted or burns away.
    useEffect(() => {
        if (replyTo && !messages.some((m) => m.id === replyTo.id)) setReplyTo(null);
    }, [messages, replyTo]);

    useEffect(() => {
        if (!localError) return undefined;
        const timer = setTimeout(() => setLocalError(''), 4000);
        return () => clearTimeout(timer);
    }, [localError]);

    const stopTyping = useCallback(() => {
        clearTimeout(typingIdleRef.current);
        if (typingSentAtRef.current) {
            typingSentAtRef.current = 0;
            setTyping(false);
        }
    }, [setTyping]);

    useEffect(() => () => clearTimeout(typingIdleRef.current), []);

    const handleChange = (e) => {
        setNewMessage(e.target.value);
        if (!e.target.value.trim()) {
            stopTyping();
            return;
        }
        const now = Date.now();
        if (now - typingSentAtRef.current > TYPING_RESEND_MS) {
            typingSentAtRef.current = now;
            setTyping(true);
        }
        clearTimeout(typingIdleRef.current);
        typingIdleRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
    };

    const handleReply = (message) => {
        setReplyTo(message);
        inputRef.current?.focus();
    };

    const handlePickFile = (e) => {
        const picked = e.target.files?.[0];
        e.target.value = '';
        if (!picked) return;
        if (picked.size > MAX_FILE_BYTES) {
            setLocalError(`Files are limited to ${formatBytes(MAX_FILE_BYTES)}`);
            return;
        }
        setFile(picked);
        inputRef.current?.focus();
    };

    const handleSendMessage = async () => {
        const trimmed = newMessage.trim();
        if (!canSend || (!trimmed && !file)) return;

        setSending(true);
        stopTyping();
        // Clear the composer immediately; the message appears with a clock.
        const outgoing = { text: trimmed, file, replyTo };
        setNewMessage('');
        setFile(null);
        setReplyTo(null);
        try {
            if (outgoing.file) {
                await sendFile(outgoing.file, outgoing.text, burn.seconds, outgoing.replyTo);
            } else {
                await sendText(outgoing.text, burn.seconds, outgoing.replyTo);
            }
        } catch (error) {
            console.error(error);
            setLocalError('That message could not be encrypted and sent');
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        // Ignore Enter while an IME is composing, so it does not send half-typed text.
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSendMessage();
        if (e.key === 'Escape') setReplyTo(null);
    };

    let placeholder = 'Message';
    if (isMuted) placeholder = 'The host has muted you';
    else if (!isConnected) placeholder = 'Reconnecting…';
    else if (file) placeholder = 'Add a caption (optional)';

    const hasDraft = !!newMessage.trim() || !!file;

    return (
        <div className="flex-1 flex flex-col min-w-0">
            {pinned.length > 0 && (
                <div className={`${COLUMN} pt-3 flex-shrink-0`}>
                    <div className="rounded-xl bg-surface border border-line text-sm">
                        <button
                            onClick={() => setShowPinned((open) => !open)}
                            className="w-full flex items-center justify-between h-10 px-3 rounded-xl text-ink-2 hover:text-ink transition-colors"
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <Pin size={16} />
                                <span className="truncate">{pinned.length} pinned · kept when the room closes</span>
                            </span>
                            {showPinned ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {showPinned && (
                            <ul className="px-3 pb-3 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                {pinned.map((m) => (
                                    <li key={m.id} className="flex items-center gap-1 min-w-0 text-ink-2">
                                        <span className="font-medium text-ink flex-shrink-0">{m.username}:</span>
                                        {m.file && <Paperclip size={12} aria-label="File" />}
                                        <span className="truncate">{m.text || m.file?.name || ''}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="relative flex-1 min-h-0">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar"
                >
                    <div className={`${COLUMN} py-4`}>
                        <MessageList messages={messages} onReply={handleReply} replyingToId={replyTo?.id} />
                        {typingUsers.length > 0 && (
                            <div className="mt-3 flex items-center gap-2 animate-msg-in">
                                {/* Stacked avatars of whoever is typing. */}
                                <div className="flex -space-x-2">
                                    {typingUsers.slice(0, 3).map((name) => (
                                        <Avatar key={name} name={name} className="ring-2 ring-page" />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 h-9 px-3 rounded-xl rounded-tl-sm bg-surface border border-line text-ink-3">
                                    <TypingDots />
                                    <TypingLabel names={typingUsers} className="text-xs" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!atBottom && (
                    <button
                        onClick={() => scrollToBottom()}
                        className={`btn btn-secondary absolute bottom-4 right-4 animate-notice-in ${unseenCount ? '' : 'btn-icon'}`}
                        aria-label={unseenCount ? `${unseenCount} new messages, jump to latest` : 'Jump to latest'}
                    >
                        {unseenCount > 0 && (
                            <span className="font-mono text-xs tabular-nums">{unseenCount > 99 ? '99+' : unseenCount} new</span>
                        )}
                        <ArrowDown size={16} />
                    </button>
                )}
            </div>

            {/* Composer */}
            <div className={`${COLUMN} pt-2 pb-4 flex-shrink-0`}>
                {localError && (
                    <div className="mb-2 text-sm text-negative animate-notice-in" role="alert">{localError}</div>
                )}

                {(replyTo || file) && (
                    <div className="mb-2 rounded-xl bg-surface border border-line overflow-hidden animate-notice-in">
                        {replyTo && (
                            <div className="flex items-start gap-2 px-3 py-2 border-l-2 border-accent text-sm">
                                <Reply size={16} className="mt-0.5 text-ink-3" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-ink-2">
                                        Replying to {replyTo.username === me?.username ? 'yourself' : replyTo.username}
                                    </div>
                                    <div className="truncate text-ink">{replySnippet(replyTo)}</div>
                                </div>
                                <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" title="Cancel reply (Esc)" className="btn-icon-sm">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                        {file && (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-ink border-t border-line first:border-t-0">
                                <Paperclip size={16} className="text-ink-3" />
                                <span className="truncate">{file.name}</span>
                                <span className="font-mono text-xs text-ink-3 flex-shrink-0">{formatBytes(file.size)}</span>
                                <button onClick={() => setFile(null)} aria-label="Remove attachment" className="btn-icon-sm ml-auto">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-line-strong focus-within:border-ink-3 transition-colors">
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handlePickFile} />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canSend}
                        className="btn btn-ghost btn-icon"
                        aria-label="Attach a file"
                        title="Attach a file (deleted with the room)"
                    >
                        <Paperclip size={16} />
                    </button>

                    {/* Tap to cycle the self-destruct timer: off, 10s, 1 min, 5 min. */}
                    <button
                        onClick={() => setBurnIndex((i) => (i + 1) % BURN_OPTIONS.length)}
                        className={`btn btn-ghost gap-1 ${burn.seconds ? 'px-2 bg-accent-soft text-accent' : 'btn-icon'}`}
                        aria-label={`Self-destruct timer: ${burn.label}. Tap to change.`}
                        title={burn.seconds ? `Disappears after ${burn.label}` : 'Self-destruct: off'}
                    >
                        <Flame size={16} />
                        {burn.seconds > 0 && <span className="font-mono text-xs">{burn.label}</span>}
                    </button>

                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onBlur={stopTyping}
                        maxLength={MESSAGE_MAX_LENGTH}
                        placeholder={placeholder}
                        aria-label="Message"
                        disabled={!isConnected || isMuted}
                        className="flex-1 min-w-0 h-9 px-2 bg-transparent border-none text-[15px] text-ink
                            placeholder:text-ink-3 outline-none disabled:cursor-not-allowed"
                    />

                    <button
                        onClick={handleSendMessage}
                        disabled={!canSend || !hasDraft}
                        aria-label="Send message"
                        className="btn btn-primary btn-icon"
                    >
                        <Send size={16} />
                    </button>
                </div>

                {room?.slowModeSeconds > 0 && !me?.isHost && (
                    <p className="mt-1 px-1 text-xs text-ink-3">
                        Slow mode: one message every {room.slowModeSeconds} seconds
                    </p>
                )}
            </div>
        </div>
    );
}

export default ChatArea;
