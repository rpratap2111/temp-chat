import React from 'react';

function MessageList({ messages, currentUsername }) {
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            {messages.map((msg, index) => {
                const isSelf = msg.username === currentUsername;
                const isSystem = msg.messageType === 'system';

                return (
                    <div
                        key={index}
                        className={`flex mb-2 ${isSystem
                            ? 'justify-center'
                            : isSelf
                                ? 'justify-end'
                                : 'justify-start'
                            }`}
                    >
                        {isSystem ? (
                            <div className="bg-white/70 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-1.5 rounded-full text-sm backdrop-blur-md border border-white/30 shadow">
                                {msg.message}
                            </div>
                        ) : (
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-md backdrop-blur-lg border ${
                                    isSelf
                                        ? 'bg-blue-600 text-white border-blue-500'
                                        : 'bg-white/50 dark:bg-white/10 text-gray-900 dark:text-white border-white/20'
                                }`}
                            >
                                {!isSelf && (
                                    <div className="text-xs font-semibold mb-1 opacity-80 text-blue-700 dark:text-blue-300">
                                        {msg.username}
                                    </div>
                                )}
                                <div className="break-words">{msg.message}</div>
                                <div
                                    className={`text-[11px] mt-1 text-right ${
                                        isSelf ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                    {formatTime(msg.timeStamp)}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}

export default MessageList;
