import React, { useEffect, useState } from 'react';
import { MessageCircle, UserPlus, LogIn, ShieldCheck } from 'lucide-react';
import { createRoom, getRoomInfo } from '../services/api';
import { generateRoomKey, randomToken } from '../lib/crypto';
import { buildInviteLink, parseInvite } from '../lib/invite';
import { loadLastUsername } from '../lib/session';
import {
    USERNAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    LIFETIME_OPTIONS,
    DEFAULT_LIFETIME_MINUTES,
    END_POLICY_OPTIONS,
} from '../config';
import Mode from './Mode';
import { formatRemaining } from './Countdown';

const INPUT_CLASS = 'w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

function Home({ onEnterRoom, invite, notice }) {
    const [tab, setTab] = useState(invite ? 'join' : 'create');
    const [username, setUsername] = useState(loadLastUsername);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Create
    const [lifetimeMinutes, setLifetimeMinutes] = useState(DEFAULT_LIFETIME_MINUTES);
    const [endPolicy, setEndPolicy] = useState('host_leaves');
    const [createPassword, setCreatePassword] = useState('');

    // Join
    const [inviteText, setInviteText] = useState(() => (invite ? buildInviteLink(invite) : ''));
    const [joinPassword, setJoinPassword] = useState('');
    const [roomInfo, setRoomInfo] = useState(null);
    const [lookupError, setLookupError] = useState('');

    const parsedInvite = parseInvite(inviteText);
    const parsedCode = parsedInvite?.roomCode;

    // Look the room up as soon as a valid invite is pasted, to show whether it
    // exists, when it expires and whether it needs a password.
    useEffect(() => {
        setRoomInfo(null);
        setLookupError('');
        if (!parsedCode) return undefined;

        let cancelled = false;
        getRoomInfo(parsedCode)
            .then((info) => { if (!cancelled) setRoomInfo(info); })
            .catch((err) => { if (!cancelled) setLookupError(err.message); });
        return () => { cancelled = true; };
    }, [parsedCode]);

    const switchTab = (next) => {
        setTab(next);
        setError('');
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const name = username.trim();
        if (!name) {
            setError('Please enter a username');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const data = await createRoom({ lifetimeMinutes, endPolicy, password: createPassword });
            const key = await generateRoomKey();
            onEnterRoom({
                roomCode: data.roomCode,
                key,
                username: name,
                memberToken: randomToken(),
                hostToken: data.hostToken,
            });
        } catch (err) {
            setError(err.message || 'Network Error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = (e) => {
        e.preventDefault();
        const name = username.trim();
        if (!parsedInvite) {
            setError('Paste the full invite link. The room code alone cannot unlock the messages.');
            return;
        }
        if (!name) {
            setError('Please enter a username');
            return;
        }
        if (roomInfo?.requiresPassword && !joinPassword) {
            setError('This room needs a password');
            return;
        }

        setError('');
        onEnterRoom({
            roomCode: parsedInvite.roomCode,
            key: parsedInvite.key,
            username: name,
            memberToken: randomToken(),
            password: roomInfo?.requiresPassword ? joinPassword : undefined,
        });
    };

    const tabClass = (name) => `flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === name
        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-200 via-indigo-100 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
            <Mode />
            <div className="w-full max-w-md p-8 rounded-2xl shadow-xl bg-white/30 dark:bg-white/10 backdrop-blur-lg border border-white/20 animate-fadein">
                <div className="text-center mb-6">
                    <MessageCircle className="mx-auto mb-4 text-blue-600 dark:text-blue-400" size={48} />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Temp Chat</h1>
                    <p className="text-gray-600 dark:text-gray-300">Private while it lasts. Gone when it ends.</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                        <ShieldCheck size={14} /> Messages are end-to-end encrypted in your browser
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-400/20 border border-red-300 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {notice && !error && (
                    <div className="bg-blue-50 dark:bg-blue-400/20 border border-blue-300 dark:border-blue-500 text-blue-700 dark:text-blue-200 px-4 py-3 rounded-lg mb-4">
                        {notice}
                    </div>
                )}

                <div className="flex gap-1 p-1 mb-5 rounded-xl bg-white/40 dark:bg-white/5">
                    <button type="button" className={tabClass('create')} onClick={() => switchTab('create')}>Create room</button>
                    <button type="button" className={tabClass('join')} onClick={() => switchTab('join')}>Join room</button>
                </div>

                <div className="mb-4">
                    <label className={LABEL_CLASS} htmlFor="username">Your name</label>
                    <input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        maxLength={USERNAME_MAX_LENGTH}
                        className={INPUT_CLASS}
                        disabled={loading}
                    />
                </div>

                {tab === 'create' ? (
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASS} htmlFor="lifetime">Room lasts</label>
                                <select
                                    id="lifetime"
                                    value={lifetimeMinutes}
                                    onChange={(e) => setLifetimeMinutes(Number(e.target.value))}
                                    className={INPUT_CLASS}
                                    disabled={loading}
                                >
                                    {LIFETIME_OPTIONS.map((o) => (
                                        <option key={o.minutes} value={o.minutes}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={LABEL_CLASS} htmlFor="endPolicy">Also close</label>
                                <select
                                    id="endPolicy"
                                    value={endPolicy}
                                    onChange={(e) => setEndPolicy(e.target.value)}
                                    className={INPUT_CLASS}
                                    disabled={loading}
                                >
                                    {END_POLICY_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={LABEL_CLASS} htmlFor="createPassword">Password (optional)</label>
                            <input
                                id="createPassword"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Leave empty for no password"
                                value={createPassword}
                                onChange={(e) => setCreatePassword(e.target.value)}
                                maxLength={PASSWORD_MAX_LENGTH}
                                className={INPUT_CLASS}
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <UserPlus size={20} />
                            {loading ? 'Creating...' : 'Create room'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className={LABEL_CLASS} htmlFor="invite">Invite link</label>
                            <input
                                id="invite"
                                type="text"
                                placeholder="Paste the invite link you were sent"
                                value={inviteText}
                                onChange={(e) => setInviteText(e.target.value)}
                                className={INPUT_CLASS}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {inviteText && !parsedInvite && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-300">That doesn't look like a full invite link.</p>
                            )}
                            {roomInfo && (
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                    Room {roomInfo.roomCode} · closes in {formatRemaining(new Date(roomInfo.expiresAt) - Date.now())}
                                    {roomInfo.locked && ' · locked by the host'}
                                </p>
                            )}
                            {lookupError && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-300">{lookupError}</p>
                            )}
                        </div>

                        {roomInfo?.requiresPassword && (
                            <div>
                                <label className={LABEL_CLASS} htmlFor="joinPassword">Room password</label>
                                <input
                                    id="joinPassword"
                                    type="password"
                                    autoComplete="off"
                                    value={joinPassword}
                                    onChange={(e) => setJoinPassword(e.target.value)}
                                    maxLength={PASSWORD_MAX_LENGTH}
                                    className={INPUT_CLASS}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!parsedInvite || !!lookupError || roomInfo?.locked}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <LogIn size={20} />
                            Join room
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Home;
