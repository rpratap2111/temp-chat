import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Flame, X, Pin, ChevronDown, ChevronUp, Reply } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { MESSAGE_MAX_LENGTH, MAX_FILE_BYTES, BURN_OPTIONS } from '../config';
import { replySnippet } from '../lib/reply';
import MessageList from './MessageList';

const formatBytes = (bytes) => (bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

function ChatArea() {
    const { messages, users, me, room, isConnected, sendText, sendFile } = useSocket();
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState(null);
    const [burnSeconds, setBurnSeconds] = useState(0);
    const [sending, setSending] = useState(false);
    const [localError, setLocalError] = useState('');
    const [showPinned, setShowPinned] = useState(false);
    // The message being replied to, chosen by double-clicking it.
    const [replyTo, setReplyTo] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);

    const isMuted = !!users.find((u) => u.username === me?.username)?.muted;
    const canSend = isConnected && !!me && !isMuted && !sending;
    const pinned = messages.filter((m) => m.pinned && !m.undecryptable);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Drop the reply target if that message is deleted or burns away.
    useEffect(() => {
        if (replyTo && !messages.some((m) => m.id === replyTo.id)) setReplyTo(null);
    }, [messages, replyTo]);

    useEffect(() => {
        if (!localError) return undefined;
        const timer = setTimeout(() => setLocalError(''), 4000);
        return () => clearTimeout(timer);
    }, [localError]);

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
    };

    const handleSendMessage = async () => {
        const trimmed = newMessage.trim();
        if (!canSend || (!trimmed && !file)) return;

        setSending(true);
        try {
            if (file) {
                await sendFile(file, trimmed, burnSeconds, replyTo);
            } else {
                await sendText(trimmed, burnSeconds, replyTo);
            }
            setNewMessage('');
            setFile(null);
            setReplyTo(null);
        } catch (error) {
            console.error(error);
            setLocalError('That message could not be encrypted and sent.');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        // Ignore Enter while an IME is composing, so it does not send half-typed text.
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSendMessage();
        if (e.key === 'Escape') setReplyTo(null);
    };

    let placeholder = 'Type your message...';
    if (isMuted) placeholder = 'The host has muted you';
    else if (!isConnected) placeholder = 'Reconnecting…';
    else if (file) placeholder = 'Add a caption (optional)';

    return (
        <div className="flex-1 flex flex-col p-4 min-w-0">
            {pinned.length > 0 && (
                <div className="mb-3 rounded-xl bg-amber-50/80 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-500/30 text-sm">
                    <button
                        onClick={() => setShowPinned((open) => !open)}
                        className="w-full flex items-center justify-between px-4 py-2 text-amber-800 dark:text-amber-200 font-medium"
                    >
                        <span className="flex items-center gap-2">
                            <Pin size={14} /> {pinned.length} pinned · kept as the takeaway when the room closes
                        </span>
                        {showPinned ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showPinned && (
                        <ul className="px-4 pb-3 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                            {pinned.map((m) => (
                                <li key={m.id} className="text-gray-700 dark:text-gray-200 truncate">
                                    <span className="font-semibold">{m.username}:</span>{' '}
                                    {m.text || (m.file ? `📎 ${m.file.name}` : '')}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Message List Area */}
            <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4
                rounded-2xl
                bg-gradient-to-br from-white/20 via-white/10 to-white/5
                dark:from-white/10 dark:via-white/5 dark:to-white/0
                lg:backdrop-blur-xl
                shadow-lg
                border border-white/30
                transition-all duration-500
                min-h-0 custom-scrollbar">
                <MessageList messages={messages} onReply={handleReply} replyingToId={replyTo?.id} />
                <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="mt-4 px-2 flex-shrink-0 w-full max-w-full">
                {localError && (
                    <div className="mb-2 text-sm text-red-700 dark:text-red-300">{localError}</div>
                )}

                {replyTo && (
                    <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-white/60 dark:bg-white/10 border-l-4 border-blue-500 text-sm">
                        <Reply size={14} className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-300" />
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                Replying to {replyTo.username === me?.username ? 'yourself' : replyTo.username}
                            </div>
                            <div className="truncate text-gray-700 dark:text-gray-200">{replySnippet(replyTo)}</div>
                        </div>
                        <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" title="Cancel reply (Esc)"
                            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {file && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-white/10 text-sm text-gray-800 dark:text-gray-100">
                        <Paperclip size={14} />
                        <span className="truncate max-w-[14rem]">{file.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</span>
                        <button onClick={() => setFile(null)} aria-label="Remove attachment" className="p-0.5 rounded hover:bg-black/10">
                            <X size={14} />
                        </button>
                    </div>
                )}

                <div className="flex gap-2 items-center w-full
                    bg-white/80 dark:bg-gray-800/90
                    p-2 sm:p-3
                    rounded-xl
                    border border-white/20">

                    <input ref={fileInputRef} type="file" className="hidden" onChange={handlePickFile} />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canSend}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
                        aria-label="Attach a file"
                        title="Attach a file (deleted with the room)"
                    >
                        <Paperclip size={18} />
                    </button>

                    <label className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${burnSeconds ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' : 'text-gray-600 dark:text-gray-300'}`}
                        title="Make this message disappear for everyone after a delay">
                        <Flame size={16} />
                        <select
                            value={burnSeconds}
                            onChange={(e) => setBurnSeconds(Number(e.target.value))}
                            className="bg-transparent outline-none cursor-pointer"
                            aria-label="Self-destruct timer"
                        >
                            {BURN_OPTIONS.map((o) => (
                                <option key={o.seconds} value={o.seconds} className="text-black">{o.label}</option>
                            ))}
                        </select>
                    </label>

                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        maxLength={MESSAGE_MAX_LENGTH}
                        placeholder={placeholder}
                        disabled={!isConnected || isMuted}
                        className="flex-1 min-w-0 px-2 sm:px-4 py-2 bg-transparent border-none
                            text-black dark:text-white
                            placeholder-gray-500 dark:placeholder-gray-400
                            focus:outline-none disabled:cursor-not-allowed"
                    />

                    <button
                        onClick={handleSendMessage}
                        disabled={!canSend}
                        aria-label="Send message"
                        className="bg-blue-600 hover:bg-blue-700 text-white
                            px-4 py-2 rounded-xl
                            transition duration-200
                            flex items-center gap-2 disabled:opacity-50"
                    >
                        <Send size={16} />
                        <span className="hidden sm:inline">{sending ? 'Sending…' : 'Send'}</span>
                    </button>
                </div>

                {room?.slowModeSeconds > 0 && !me?.isHost && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Slow mode: one message every {room.slowModeSeconds} seconds.
                    </p>
                )}
            </div>
        </div>
    );
}

export default ChatArea;
