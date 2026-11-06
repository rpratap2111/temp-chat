import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
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
import RoomPreview from './RoomPreview';
import { formatRemaining } from './Countdown';

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
            setError('Enter your name');
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
            setError(err.message || 'Could not reach the server. Try again');
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
            setError('Enter your name');
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

    const tabClass = (name) => `flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${tab === name
        ? 'bg-surface text-ink border border-line'
        : 'text-ink-2 hover:text-ink'}`;

    return (
        <div className="min-h-screen flex flex-col bg-page">
            <header className="flex items-center justify-between h-16 px-4 sm:px-8 flex-shrink-0">
                <span className="text-base font-medium text-ink">Temp Chat</span>
                <Mode className="" />
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 pb-12 grid gap-8 lg:gap-x-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_auto] lg:content-center animate-fadein">
                <div className="lg:self-end">
                    <h1 className="text-4xl lg:text-6xl font-medium tracking-tight leading-[1.08] text-ink">
                        Private while it lasts.<br />Gone when it ends.
                    </h1>
                    <p className="mt-4 flex items-center gap-2 text-sm text-ink-2">
                        <ShieldCheck size={16} /> Messages are end-to-end encrypted in your browser
                    </p>
                </div>

                <div className="p-6 rounded-2xl bg-surface border border-line lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
                {error && (
                    <div className="bg-negative-soft text-negative text-sm px-3 py-2 rounded-lg mb-4" role="alert">
                        {error}
                    </div>
                )}

                {notice && !error && (
                    <div className="bg-raised text-ink-2 text-sm px-3 py-2 rounded-lg mb-4" role="status">
                        {notice}
                    </div>
                )}

                <div className="flex gap-1 p-1 mb-5 rounded-xl bg-raised">
                    <button type="button" className={tabClass('create')} onClick={() => switchTab('create')}>Create room</button>
                    <button type="button" className={tabClass('join')} onClick={() => switchTab('join')}>Join room</button>
                </div>

                <div className="mb-4">
                    <label className="field-label" htmlFor="username">Your name</label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        maxLength={USERNAME_MAX_LENGTH}
                        className="field"
                        disabled={loading}
                    />
                </div>

                {tab === 'create' ? (
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="field-label" htmlFor="lifetime">Room lasts</label>
                                <select
                                    id="lifetime"
                                    value={lifetimeMinutes}
                                    onChange={(e) => setLifetimeMinutes(Number(e.target.value))}
                                    className="field"
                                    disabled={loading}
                                >
                                    {LIFETIME_OPTIONS.map((o) => (
                                        <option key={o.minutes} value={o.minutes}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="field-label" htmlFor="endPolicy">Room closes</label>
                                <select
                                    id="endPolicy"
                                    value={endPolicy}
                                    onChange={(e) => setEndPolicy(e.target.value)}
                                    className="field"
                                    disabled={loading}
                                >
                                    {END_POLICY_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="field-label" htmlFor="createPassword">Password (optional)</label>
                            <input
                                id="createPassword"
                                type="password"
                                autoComplete="new-password"
                                value={createPassword}
                                onChange={(e) => setCreatePassword(e.target.value)}
                                maxLength={PASSWORD_MAX_LENGTH}
                                className="field"
                                disabled={loading}
                            />
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary btn-lg">
                            {loading ? 'Creating...' : 'Create room'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="field-label" htmlFor="invite">Invite link</label>
                            <input
                                id="invite"
                                type="text"
                                placeholder="Paste invite link"
                                value={inviteText}
                                onChange={(e) => setInviteText(e.target.value)}
                                className="field"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {inviteText && !parsedInvite && (
                                <p className="mt-1 text-xs text-negative">That doesn't look like a full invite link</p>
                            )}
                            {roomInfo && (
                                <p className="mt-1 text-xs text-ink-2">
                                    Room {roomInfo.roomCode} · closes in {formatRemaining(new Date(roomInfo.expiresAt) - Date.now())}
                                    {roomInfo.locked && ' · locked by the host'}
                                </p>
                            )}
                            {lookupError && (
                                <p className="mt-1 text-xs text-negative">{lookupError}</p>
                            )}
                        </div>

                        {roomInfo?.requiresPassword && (
                            <div>
                                <label className="field-label" htmlFor="joinPassword">Room password</label>
                                <input
                                    id="joinPassword"
                                    type="password"
                                    autoComplete="off"
                                    value={joinPassword}
                                    onChange={(e) => setJoinPassword(e.target.value)}
                                    maxLength={PASSWORD_MAX_LENGTH}
                                    className="field"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!parsedInvite || !!lookupError || roomInfo?.locked}
                            className="btn btn-primary btn-lg"
                        >
                            Join room
                        </button>
                    </form>
                )}
                </div>

                <RoomPreview className="lg:col-start-1 lg:row-start-2 lg:self-start" />
            </main>
        </div>
    );
}

export default Home;
