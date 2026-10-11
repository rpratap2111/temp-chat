import React from 'react';
import { Pin, PinOff, Trash2, Flame, Download, Paperclip, Reply } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const burnLabel = (burnAt, timeStamp) => {
    const seconds = Math.round((new Date(burnAt) - new Date(timeStamp)) / 1000);
    return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds}s`;
};

const HIGHLIGHT_CLASSES = ['ring-4', 'ring-blue-400/70'];

// Scrolls to a message and flashes it, for clicks on a reply's quote.
function jumpToMessage(id) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(...HIGHLIGHT_CLASSES);
    setTimeout(() => el.classList.remove(...HIGHLIGHT_CLASSES), 1500);
}

function Attachment({ file, isSelf }) {
    if (file.isImage) {
        return (
            <a href={file.url} download={file.name} title={`Download ${file.name}`}>
                <img src={file.url} alt={file.name} className="mt-1 max-h-64 rounded-lg object-contain" />
            </a>
        );
    }
    return (
        <a
            href={file.url}
            download={file.name}
            className={`mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isSelf ? 'bg-blue-700/60 hover:bg-blue-700' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'}`}
        >
            <Paperclip size={14} />
            <span className="truncate">{file.name}</span>
            <Download size={14} className="ml-auto flex-shrink-0" />
        </a>
    );
}

// The quoted message shown at the top of a reply.
function ReplyQuote({ replyTo, isSelf, exists }) {
    const body = (
        <>
            <div className={`text-xs font-semibold ${isSelf ? 'text-blue-100' : 'text-blue-700 dark:text-blue-300'}`}>
                {replyTo.username}
            </div>
            <div className="text-xs truncate opacity-90">
                {exists ? replyTo.snippet : 'Message no longer available'}
            </div>
        </>
    );
    const className = `block w-full text-left mb-1 px-2 py-1 rounded-lg border-l-4 ${isSelf
        ? 'bg-blue-700/50 border-blue-200'
        : 'bg-black/5 dark:bg-white/10 border-blue-500'}`;

    if (!exists) return <div className={`${className} italic`}>{body}</div>;
    return (
        <button
            type="button"
            onClick={() => jumpToMessage(replyTo.id)}
            className={`${className} hover:brightness-110`}
            title="Go to the original message"
        >
            {body}
        </button>
    );
}

function MessageList({ messages, onReply, replyingToId }) {
    const { me, deleteMessage, setPinned } = useSocket();
    const liveIds = new Set(messages.map((m) => m.id));

    // Double-clicking anywhere on a message's row, including the empty space
    // beside the bubble, picks it as the reply target. Double-clicks on the
    // row's own buttons and links keep their normal behaviour.
    const handleDoubleClick = (event, msg) => {
        if (event.target.closest('button, a')) return;
        window.getSelection()?.removeAllRanges();
        onReply(msg);
    };

    return (
        <>
            {messages.map((msg) => {
                if (msg.messageType === 'system') {
                    return (
                        <div key={msg.id} className="flex justify-center mb-2">
                            <div className="bg-white/70 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-1.5 rounded-full text-sm lg:backdrop-blur-md border border-white/30 shadow text-center">
                                {msg.text}
                            </div>
                        </div>
                    );
                }

                const isSelf = msg.username === me?.username;
                const canDelete = isSelf || me?.isHost;
                const canReply = !msg.undecryptable;
                const isReplyTarget = msg.id === replyingToId;

                return (
                    <div
                        key={msg.id}
                        onDoubleClick={canReply ? (e) => handleDoubleClick(e, msg) : undefined}
                        title={canReply ? 'Double-click to reply' : undefined}
                        className={`group flex mb-1 -mx-2 px-2 py-1 rounded-xl transition-colors ${isSelf ? 'justify-end' : 'justify-start'} ${isReplyTarget
                            ? 'bg-blue-500/15'
                            : canReply ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
                    >
                        <div className={`flex items-start gap-1 max-w-full ${isSelf ? 'flex-row-reverse' : ''}`}>
                            <div
                                id={`msg-${msg.id}`}
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-md lg:backdrop-blur-lg border transition-shadow cursor-default ${isSelf
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-white/50 dark:bg-white/10 text-gray-900 dark:text-white border-white/20'
                                    } ${isReplyTarget ? 'ring-2 ring-blue-400' : msg.pinned ? 'ring-2 ring-amber-400' : ''}`}
                            >
                                {!isSelf && (
                                    <div className="text-xs font-semibold mb-1 opacity-80 text-blue-700 dark:text-blue-300">
                                        {msg.username}
                                    </div>
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
                                        {msg.text && <div className="break-words whitespace-pre-wrap">{msg.text}</div>}
                                    </>
                                )}

                                <div className={`flex items-center justify-end gap-2 text-[11px] mt-1 ${isSelf ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {msg.pinned && <span className="inline-flex items-center gap-0.5"><Pin size={10} /> pinned</span>}
                                    {msg.burnAt && (
                                        <span className="inline-flex items-center gap-0.5" title="This message will disappear for everyone">
                                            <Flame size={10} /> {burnLabel(msg.burnAt, msg.timeStamp)}
                                        </span>
                                    )}
                                    {formatTime(msg.timeStamp)}
                                </div>
                            </div>

                            {canReply && (
                                <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition">
                                    {/* Touch screens don't reliably double-click, so replying also has a button. */}
                                    <button
                                        onClick={() => onReply(msg)}
                                        className="p-1 rounded-md text-gray-500 hover:text-blue-600 hover:bg-white/60 dark:hover:bg-white/10"
                                        aria-label="Reply to message"
                                        title="Reply"
                                    >
                                        <Reply size={14} />
                                    </button>
                                    <button
                                        onClick={() => setPinned(msg.id, !msg.pinned)}
                                        className="p-1 rounded-md text-gray-500 hover:text-amber-600 hover:bg-white/60 dark:hover:bg-white/10"
                                        aria-label={msg.pinned ? 'Unpin message' : 'Pin message to keep it'}
                                        title={msg.pinned ? 'Unpin' : 'Pin to keep when the room closes'}
                                    >
                                        {msg.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                                    </button>
                                    {canDelete && (
                                        <button
                                            onClick={() => deleteMessage(msg.id)}
                                            className="p-1 rounded-md text-gray-500 hover:text-red-600 hover:bg-white/60 dark:hover:bg-white/10"
                                            aria-label="Delete message"
                                            title="Delete for everyone"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

export default MessageList;
