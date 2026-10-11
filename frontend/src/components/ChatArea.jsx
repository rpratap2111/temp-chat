import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, Flame, X, Pin, ChevronDown, ChevronUp, Reply, ArrowDown } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { MESSAGE_MAX_LENGTH, MAX_FILE_BYTES, BURN_OPTIONS } from '../config';
import { replySnippet } from '../lib/reply';
import MessageList from './MessageList';
import { TypingDots, TypingLabel } from './Typing';
import { AVATAR_COLORS, colorIndex } from '../lib/colors';

const formatBytes = (bytes) => (bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

// Within this distance of the bottom, new messages scroll into view on their own.
const STICK_TO_BOTTOM_PX = 120;
// "Typing" is re-sent at most this often, and cleared after this much idle time.
const TYPING_RESEND_MS = 2500;
const TYPING_IDLE_MS = 3000;

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
            setLocalError(`Files are limited to ${formatBytes(MAX_FILE_BYTES)}.`);
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
            setLocalError('That message could not be encrypted and sent.');
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
        <div className="flex-1 flex flex-col p-2 sm:p-4 min-w-0">
            {pinned.length > 0 && (
                <div className="mb-2 rounded-xl bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-500/30 text-sm shadow-sm">
                    <button
                        onClick={() => setShowPinned((open) => !open)}
                        className="w-full flex items-center justify-between px-4 py-2 text-amber-800 dark:text-amber-200 font-medium"
                    >
                        <span className="flex items-center gap-2 min-w-0">
                            <Pin size={14} className="flex-shrink-0" />
                            <span className="truncate">{pinned.length} pinned · kept when the room closes</span>
                        </span>
                        {showPinned ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showPinned && (
                        <ul className="px-4 pb-3 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                            {pinned.map((m) => (
                                <li key={m.id} className="flex items-center gap-1 min-w-0 text-gray-700 dark:text-gray-200">
                                    <span className="font-semibold flex-shrink-0">{m.username}:</span>
                                    {m.file && <Paperclip size={13} className="flex-shrink-0" aria-label="File" />}
                                    <span className="truncate">{m.text || m.file?.name || ''}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Messages */}
            <div className="relative flex-1 min-h-0">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="chat-wallpaper h-full overflow-y-auto overflow-x-hidden px-3 sm:px-5 py-3
                        rounded-2xl shadow-inner border border-white/40 dark:border-white/5 custom-scrollbar"
                >
                    <MessageList messages={messages} onReply={handleReply} replyingToId={replyTo?.id} />
                    {typingUsers.length > 0 && (
                        <div className="mt-3 flex items-end gap-2 animate-msg-in-left">
                            {/* Stacked avatars of whoever is typing. */}
                            <div className="flex -space-x-2 self-start">
                                {typingUsers.slice(0, 3).map((name) => (
                                    <div key={name}
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white shadow ring-2 ring-white dark:ring-slate-800 ${AVATAR_COLORS[colorIndex(name)]}`}>
                                        {name.charAt(0).toUpperCase()}
                                    </div>
                                ))}
                            </div>
                            <div className="relative bubble-tail-left flex flex-col items-start gap-1.5 rounded-2xl rounded-tl-none bg-white dark:bg-slate-700 px-3.5 py-2.5 shadow-sm animate-typing-breathe">
                                <TypingLabel names={typingUsers} className="text-xs font-semibold text-indigo-600 dark:text-indigo-300" />
                                <TypingDots className="text-slate-400 dark:text-slate-300" />
                            </div>
                        </div>
                    )}
                </div>

                {!atBottom && (
                    <button
                        onClick={() => scrollToBottom()}
                        className={`absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg border border-black/5 hover:scale-105 transition animate-notice-in dark:bg-slate-700 dark:text-slate-100 dark:border-white/10 ${unseenCount ? 'animate-soft-ping' : ''}`}
                        aria-label={unseenCount ? `${unseenCount} new messages, jump to latest` : 'Jump to latest'}
                    >
                        <ArrowDown size={18} />
                        {unseenCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                                {unseenCount > 99 ? '99+' : unseenCount}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Composer */}
            <div className="mt-2 sm:mt-3 flex-shrink-0 w-full">
                {localError && (
                    <div className="mb-2 px-3 text-sm text-red-700 dark:text-red-300 animate-notice-in">{localError}</div>
                )}

                {(replyTo || file) && (
                    <div className="mb-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 shadow-sm overflow-hidden animate-notice-in">
                        {replyTo && (
                            <div className="flex items-start gap-2 px-3 py-2 border-l-4 border-indigo-500 text-sm">
                                <Reply size={14} className="mt-0.5 flex-shrink-0 text-indigo-600 dark:text-indigo-300" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                        Replying to {replyTo.username === me?.username ? 'yourself' : replyTo.username}
                                    </div>
                                    <div className="truncate text-slate-700 dark:text-slate-200">{replySnippet(replyTo)}</div>
                                </div>
                                <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" title="Cancel reply (Esc)"
                                    className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        {file && (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 border-t border-black/5 dark:border-white/5 first:border-t-0">
                                <Paperclip size={14} className="text-indigo-600 dark:text-indigo-300" />
                                <span className="truncate">{file.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{formatBytes(file.size)}</span>
                                <button onClick={() => setFile(null)} aria-label="Remove attachment"
                                    className="ml-auto p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-1 pl-1.5 pr-2 py-1.5 rounded-full
                        bg-white dark:bg-slate-800 shadow-md border border-black/5 dark:border-white/10
                        focus-within:ring-2 focus-within:ring-indigo-400/60 transition-shadow">

                        <input ref={fileInputRef} type="file" className="hidden" onChange={handlePickFile} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!canSend}
                            className="p-2 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:bg-white/10 disabled:opacity-40 transition"
                            aria-label="Attach a file"
                            title="Attach a file (deleted with the room)"
                        >
                            <Paperclip size={19} />
                        </button>

                        {/* Tap to cycle the self-destruct timer: off, 10s, 1 min, 5 min. */}
                        <button
                            onClick={() => setBurnIndex((i) => (i + 1) % BURN_OPTIONS.length)}
                            className={`flex items-center gap-0.5 p-2 rounded-full text-xs font-semibold transition ${burn.seconds
                                ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300'
                                : 'text-slate-500 hover:text-orange-500 hover:bg-orange-50 dark:text-slate-400 dark:hover:bg-white/10'}`}
                            aria-label={`Self-destruct timer: ${burn.label}. Tap to change.`}
                            title={burn.seconds ? `Disappears after ${burn.label}` : 'Self-destruct: off'}
                        >
                            <Flame size={19} />
                            {burn.seconds > 0 && <span>{burn.label}</span>}
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
                            disabled={!isConnected || isMuted}
                            className="flex-1 min-w-0 px-2 py-1.5 bg-transparent border-none text-[15px]
                                text-slate-900 dark:text-white
                                placeholder-slate-400 dark:placeholder-slate-500
                                focus:outline-none disabled:cursor-not-allowed"
                        />
                    </div>

                    <button
                        onClick={handleSendMessage}
                        disabled={!canSend || !hasDraft}
                        aria-label="Send message"
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200
                            bg-gradient-to-br from-indigo-500 to-violet-600
                            ${hasDraft && canSend ? 'scale-100 hover:scale-105 active:scale-90' : 'scale-90 opacity-50'}`}
                    >
                        <Send size={20} className={`transition-transform duration-200 ${hasDraft ? 'translate-x-0.5 -rotate-12' : ''}`} />
                    </button>
                </div>

                {room?.slowModeSeconds > 0 && !me?.isHost && (
                    <p className="mt-1 px-3 text-xs text-slate-600 dark:text-slate-400">
                        Slow mode: one message every {room.slowModeSeconds} seconds.
                    </p>
                )}
            </div>
        </div>
    );
}

export default ChatArea;
