import React from 'react';
import { DoorClosed, Download, Pin, Paperclip } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-200 via-indigo-100 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <Mode />
            <div className="w-full max-w-lg p-8 rounded-2xl shadow-xl bg-white/30 dark:bg-white/10 backdrop-blur-lg border border-white/20 animate-fadein">
                <div className="text-center mb-6">
                    <DoorClosed className="mx-auto mb-3 text-gray-700 dark:text-gray-200" size={44} />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Room {roomCode} has closed</h1>
                    <p className="text-gray-600 dark:text-gray-300">{message}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Its messages have been deleted from the server.
                    </p>
                </div>

                {pinned.length > 0 ? (
                    <div className="mb-6">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            <Pin size={14} /> Pinned takeaway ({pinned.length})
                        </h2>
                        <ul className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                            {pinned.map((m) => (
                                <li key={m.id} className="px-3 py-2 rounded-lg bg-white/60 dark:bg-white/10 text-sm text-gray-800 dark:text-gray-100">
                                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">{m.username}</div>
                                    {m.text && <div className="break-words whitespace-pre-wrap">{m.text}</div>}
                                    {m.file && (
                                        <a href={m.file.url} download={m.file.name}
                                            className="mt-1 inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 underline">
                                            <Paperclip size={12} /> {m.file.name}
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={downloadTakeaway}
                            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        >
                            <Download size={16} /> Download takeaway (.txt)
                        </button>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            This copy exists only in this browser tab. It's gone once you leave this page.
                        </p>
                    </div>
                ) : (
                    <p className="mb-6 text-sm text-center text-gray-600 dark:text-gray-300">
                        Nothing was pinned, so there's nothing to keep.
                    </p>
                )}

                <button
                    onClick={onDone}
                    className="w-full py-3 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-semibold"
                >
                    Back to home
                </button>
            </div>
        </div>
    );
}

export default ClosedRoom;
