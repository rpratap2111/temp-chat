import React, { useState, useEffect, useRef } from 'react';
import { Users, LogOut, Menu, QrCode, Settings, Lock, Power } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import Header from './Header';
import ChatArea from './ChatArea';
import UsersSidebar from './UsersSidebar';
import Mode from './Mode';
import Countdown from './Countdown';
import InviteModal from './InviteModal';
import HostPanel from './HostPanel';
import LeaveDialog from './LeaveDialog';
import { TypingDots, TypingLabel } from './Typing';

const ERROR_DISPLAY_MS = 4000;

// Join failures where retrying the same invite makes sense.
const RETRYABLE_ERRORS = new Set(['bad_password', 'name_taken', 'rate_limited', 'host_present', 'locked']);

function Room({ session, onLeave, onClosed }) {
  const { connectSocket, disconnectSocket, leaveRoom, closeRoom, getPinnedMessages, room, me, users, isConnected, typingUsers } = useSocket();
  const [error, setError] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileUsers, setShowMobileUsers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
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

  // Guests just leave. The host chooses between leaving and ending the room.
  // When the room closes as soon as the host leaves, the button says so.
  const isHost = !!me?.isHost;
  // Others online who could take over as host when the host leaves.
  const hostCandidates = users.filter((u) => u.online && u.username !== me?.username).map((u) => u.username);
  const leaveEndsRoom = isHost && room?.endPolicy === 'host_leaves' && hostCandidates.length === 0;
  const exitLabel = leaveEndsRoom ? 'End room' : 'Leave';

  const leaveNow = (newHost) => {
    setShowLeaveDialog(false);
    leaveRoom(newHost);
    onLeave();
  };

  // The server closes the room and sends everyone, including us, to the takeaway.
  const endRoomForEveryone = () => {
    setShowLeaveDialog(false);
    closeRoom();
  };

  const handleLeaveRoom = () => {
    setShowMobileMenu(false);
    if (isHost) setShowLeaveDialog(true);
    else leaveNow();  // guests never hand over
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
          exitLabel={exitLabel}
          exitEndsRoom={leaveEndsRoom}
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
              {/* Like a chat app's status line: "typing…" replaces it while someone types. */}
              {typingUsers.length > 0 ? (
                <span className="flex items-center gap-1.5 min-w-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <TypingDots size="sm" />
                  <TypingLabel names={typingUsers} className="min-w-0" />
                </span>
              ) : (
                <>
                  <Countdown expiresAt={room?.expiresAt} />
                  {!isConnected && <span className="text-xs text-amber-600 dark:text-amber-400">Reconnecting…</span>}
                </>
              )}
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
                    {leaveEndsRoom ? <Power className="w-4 h-4 mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                    {leaveEndsRoom ? 'End room' : isHost ? 'Leave or end room' : 'Leave room'}
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
      {showLeaveDialog && isHost && (
        <LeaveDialog
          endPolicy={room?.endPolicy}
          candidates={hostCandidates}
          onLeave={leaveNow}
          onEnd={endRoomForEveryone}
          onClose={() => setShowLeaveDialog(false)}
        />
      )}
      {showHostPanel && me?.isHost && (
        <HostPanel onClose={() => setShowHostPanel(false)} />
      )}
    </div>
  );
}

export default Room;
