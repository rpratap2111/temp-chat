import React, { useState, useEffect, useRef } from 'react';
import { Users, LogOut, Menu, QrCode, Settings, Lock } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import Header from './Header';
import ChatArea from './ChatArea';
import UsersSidebar from './UsersSidebar';
import Mode from './Mode';
import Countdown from './Countdown';
import InviteModal from './InviteModal';
import HostPanel from './HostPanel';

const ERROR_DISPLAY_MS = 4000;

// Join failures where retrying the same invite makes sense.
const RETRYABLE_ERRORS = new Set(['bad_password', 'name_taken', 'rate_limited', 'host_present', 'locked']);

function Room({ session, onLeave, onClosed }) {
  const { connectSocket, disconnectSocket, leaveRoom, getPinnedMessages, room, me, isConnected } = useSocket();
  const [error, setError] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileUsers, setShowMobileUsers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const menuRef = useRef(null);
  const usersRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    connectSocket(session)
      .then((socket) => {
        if (cancelled) {
          socket.disconnect();
          return;
        }
        socket.on('roomError', (data) => {
          onLeave(data.message, { keepInvite: RETRYABLE_ERRORS.has(data.code) });
        });
        socket.on('kicked', (data) => onLeave(data.message));
        socket.on('roomClosed', (data) => {
          onClosed({ message: data.message, roomCode: session.roomCode, pinned: getPinnedMessages() });
        });
        // Anything else (e.g. a message that failed to send) is shown in place.
        socket.on('error', (data) => setError(data.message));
      })
      .catch(() => onLeave('This invite link is not valid.'));

    return () => {
      cancelled = true;
      disconnectSocket();
    };
  }, [session, connectSocket, disconnectSocket, getPinnedMessages, onLeave, onClosed]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(''), ERROR_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMobileMenu(false);
      if (usersRef.current && !usersRef.current.contains(event.target)) setShowMobileUsers(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLeaveRoom = () => {
    if (me?.isHost && room?.endPolicy === 'host_leaves'
      && !window.confirm('You are the host. Leaving will close the room for everyone. Leave anyway?')) {
      return;
    }
    leaveRoom();
    onLeave();
  };

  const openMenuItem = (open) => {
    setShowMobileMenu(false);
    open(true);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-200 via-indigo-100 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 overflow-hidden">

      <div className="flex-shrink-0 hidden lg:block">
        <Header
          roomCode={session.roomCode}
          username={session.username}
          onInvite={() => setShowInvite(true)}
          onHostControls={() => setShowHostPanel(true)}
          onLeaveRoom={handleLeaveRoom}
        />
      </div>

      <div className="flex-shrink-0 lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative z-40">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              Room {session.roomCode}
              {room?.locked && <Lock size={12} aria-label="Locked" />}
            </span>
            <span className="flex items-center gap-2 mt-0.5">
              <Countdown expiresAt={room?.expiresAt} />
              {!isConnected && <span className="text-xs text-amber-600 dark:text-amber-400">Reconnecting…</span>}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Mode className="" />

            <div className="relative" ref={usersRef}>
              <button
                onClick={() => { setShowMobileUsers((open) => !open); setShowMobileMenu(false); }}
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-md"
                aria-label="Show people in the room"
              >
                <Users className="w-5 h-5" />
              </button>

              {showMobileUsers && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[60] overflow-hidden">
                  <UsersSidebar isMobile />
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setShowMobileMenu((open) => !open); setShowMobileUsers(false); }}
                className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white transition-colors shadow-md"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[60] overflow-hidden py-2">
                  <div className="px-4 py-3 text-sm border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="font-medium text-gray-700 dark:text-gray-300">{session.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{me?.isHost ? 'Host' : 'Guest'}</div>
                  </div>
                  <button onClick={() => openMenuItem(setShowInvite)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                    <QrCode className="w-4 h-4 mr-2" /> Invite people
                  </button>
                  {me?.isHost && (
                    <button onClick={() => openMenuItem(setShowHostPanel)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                      <Settings className="w-4 h-4 mr-2" /> Host controls
                    </button>
                  )}
                  <button onClick={handleLeaveRoom}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center">
                    <LogOut className="w-4 h-4 mr-2" /> Leave room
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 mx-2 mt-2 sm:px-4 sm:py-3 sm:mx-4 sm:mt-4 rounded-lg animate-fadein flex-shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 flex max-w-6xl mx-auto w-full animate-fadein min-h-0 overflow-hidden">
        <ChatArea />
        <div className="hidden lg:block">
          <UsersSidebar />
        </div>
      </div>

      {showInvite && (
        <InviteModal session={session} requiresPassword={room?.requiresPassword} onClose={() => setShowInvite(false)} />
      )}
      {showHostPanel && me?.isHost && (
        <HostPanel onClose={() => setShowHostPanel(false)} />
      )}
    </div>
  );
}

export default Room;
