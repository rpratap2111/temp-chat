import React from 'react';
import { Download, Paperclip } from 'lucide-react';
import Mode from './Mode';

// Builds a plain-text record of the pinned messages for download.
function buildTakeaway({ roomCode, pinned }) {
    const lines = [
        `Temp Chat · room ${roomCode}`,
        `Saved ${new Date().toLocaleString()}`,
        '',
    ];
    for (const m of pinned) {
        const time = new Date(m.timeStamp).toLocaleString();
        const body = [m.text, m.file ? `[file: ${m.file.name}]` : ''].filter(Boolean).join(' ');
        lines.push(`[${time}] ${m.username}: ${body}`);
    }
    return lines.join('\n');
}

const formatPinTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Shown after a room closes: why it closed, and the pinned messages the room
// chose to keep. Everything else is already gone from the server.
function ClosedRoom({ info, onDone }) {
    const { message, roomCode, pinned } = info;

    const downloadTakeaway = () => {
        const blob = new Blob([buildTakeaway(info)], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `temp-chat-${roomCode}.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <div className="min-h-screen flex flex-col bg-page">
            <header className="flex items-center justify-between h-16 px-4 sm:px-8 flex-shrink-0">
                <span className="text-base font-medium text-ink">Temp Chat</span>
                <Mode className="" />
            </header>

            <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-8 pb-12 animate-fadein">
                <h1 className="text-3xl font-medium tracking-tight text-ink">
                    Room <span className="font-mono text-2xl">{roomCode}</span> has closed
                </h1>
                <p className="mt-2 text-ink-2">{message}</p>
                <p className="mt-1 text-sm text-ink-3">Its messages have been deleted from the server</p>

                {pinned.length > 0 ? (
                    <div className="mt-8">
                        {/* What survives the room: a slip of paper. */}
                        <div className="paper-shadow">
                            <div className="paper-slip rounded-t-lg px-5 pt-5">
                                <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-dashed border-paper-line font-mono text-xs text-paper-ink-2">
                                    <span>Pinned takeaway</span>
                                    <span className="tabular-nums">{pinned.length}</span>
                                </div>
                                <ul className="max-h-72 overflow-y-auto custom-scrollbar">
                                    {pinned.map((m) => (
                                        <li key={m.id} className="py-3 border-b border-dashed border-paper-line last:border-b-0 text-sm">
                                            <div className="flex items-baseline justify-between gap-4 font-mono text-xs text-paper-ink-2">
                                                <span className="truncate">{m.username}</span>
                                                <span className="tabular-nums flex-shrink-0">{formatPinTime(m.timeStamp)}</span>
                                            </div>
                                            {m.text && <div className="mt-1 break-words whitespace-pre-wrap">{m.text}</div>}
                                            {m.file && (
                                                <a href={m.file.url} download={m.file.name}
                                                    className="mt-1 inline-flex items-center gap-1 underline underline-offset-2">
                                                    <Paperclip size={12} /> {m.file.name}
                                                </a>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <button onClick={downloadTakeaway} className="btn btn-primary btn-lg mt-6">
                            <Download size={16} /> Download takeaway (.txt)
                        </button>
                        <p className="mt-2 text-xs leading-5 text-ink-3">
                            This copy exists only in this browser tab. It's gone once you leave this page.
                        </p>
                    </div>
                ) : (
                    <p className="mt-8 text-sm text-ink-2">Nothing was pinned, so there's nothing to keep</p>
                )}

                <button onClick={onDone} className="btn btn-secondary btn-lg mt-4">
                    Back to home
                </button>
            </main>
        </div>
    );
}

export default ClosedRoom;
