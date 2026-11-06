import React, { useState, useEffect, useRef } from 'react';
import { Users, LogOut, Menu, QrCode, Settings, Lock, Power, Crown, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import Header from './Header';
import ChatArea from './ChatArea';
import UsersSidebar from './UsersSidebar';
import Mode from './Mode';
import Countdown from './Countdown';
import InviteModal from './InviteModal';
import HostPanel from './HostPanel';
import LeaveDialog from './LeaveDialog';
import BurnLine from './BurnLine';
import { TypingDots, TypingLabel } from './Typing';

const ERROR_DISPLAY_MS = 4000;

const MENU_ITEM = 'w-full h-9 px-3 rounded-lg text-left text-sm flex items-center gap-2 transition-colors';

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
  // Shown to whoever the previous host handed the room to.
  const [becameHost, setBecameHost] = useState(false);
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
        socket.on('hostChanged', ({ isHost }) => { if (isHost) setBecameHost(true); });
      })
      .catch(() => onLeave('This invite link is not valid'));

    return () => {
      cancelled = true;
      disconnectSocket();
    };
  }, [session, connectSocket, disconnectSocket, getPinnedMessages, onLeave, onClosed]);

  useEffect(() => {
    if (!becameHost) return undefined;
    const timer = setTimeout(() => setBecameHost(false), 10000);
    return () => clearTimeout(timer);
  }, [becameHost]);

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
    <div className="h-screen flex flex-col bg-page overflow-hidden">

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

      <div className="flex-shrink-0 lg:hidden bg-surface relative z-40">
        <div className="flex items-center justify-between h-14 pl-4 pr-2 gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-ink flex items-center gap-1">
              <span>Room <span className="font-mono">{session.roomCode}</span></span>
              {room?.locked && <Lock size={12} aria-label="Locked" />}
            </span>
            <span className="flex items-center gap-2 min-w-0 text-xs leading-5 text-ink-2">
              {/* Like a chat app's status line: "typing" replaces it while someone types. */}
              {typingUsers.length > 0 ? (
                <>
                  <TypingDots />
                  <TypingLabel names={typingUsers} className="min-w-0" />
                </>
              ) : (
                <>
                  <Countdown expiresAt={room?.expiresAt} />
                  {!isConnected && <span className="text-caution">Reconnecting…</span>}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Mode className="" />

            <div className="relative" ref={usersRef}>
              <button
                onClick={() => { setShowMobileUsers((open) => !open); setShowMobileMenu(false); }}
                className="btn btn-ghost btn-icon"
                aria-label="Show people in the room"
              >
                <Users size={16} />
              </button>

              {showMobileUsers && (
                <div className="menu-panel absolute right-0 top-full mt-2 w-72 z-[60] overflow-hidden animate-msg-in">
                  <UsersSidebar isMobile />
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setShowMobileMenu((open) => !open); setShowMobileUsers(false); }}
                className="btn btn-ghost btn-icon"
                aria-label="Open menu"
              >
                <Menu size={16} />
              </button>

              {showMobileMenu && (
                <div className="menu-panel absolute right-0 top-full mt-2 w-56 z-[60] overflow-hidden p-1 animate-msg-in">
                  <div className="px-3 py-2 mb-1 border-b border-line">
                    <div className="text-sm font-medium text-ink truncate">{session.username}</div>
                    <div className="text-xs text-ink-3">{me?.isHost ? 'Host' : 'Guest'}</div>
                  </div>
                  <button onClick={() => openMenuItem(setShowInvite)} className={`${MENU_ITEM} text-ink hover:bg-raised`}>
                    <QrCode size={16} /> Invite people
                  </button>
                  {me?.isHost && (
                    <button onClick={() => openMenuItem(setShowHostPanel)} className={`${MENU_ITEM} text-ink hover:bg-raised`}>
                      <Settings size={16} /> Host controls
                    </button>
                  )}
                  <button onClick={handleLeaveRoom} className={`${MENU_ITEM} text-negative hover:bg-negative-soft`}>
                    {leaveEndsRoom ? <Power size={16} /> : <LogOut size={16} />}
                    {leaveEndsRoom ? 'End room' : isHost ? 'Leave or end room' : 'Leave room'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* The room's lifetime, burning down. */}
      <div className="h-0.5 flex-shrink-0 bg-line">
        <BurnLine startsAt={room?.createdAt} endsAt={room?.expiresAt} className="h-full" />
      </div>

      {becameHost && (
        <div className="mx-4 mt-3 flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-line animate-msg-in" role="status">
          <Crown size={16} className="text-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink">You are now the host</div>
            <div className="text-sm text-ink-2">You can lock the room, mute people, add time and end the room</div>
          </div>
          <button
            onClick={() => { setBecameHost(false); setShowHostPanel(true); }}
            className="btn btn-secondary hidden sm:inline-flex"
          >
            Host controls
          </button>
          <button onClick={() => setBecameHost(false)} aria-label="Dismiss" className="btn-icon-sm">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-negative-soft text-negative text-sm px-4 py-2 mx-4 mt-3 rounded-lg animate-notice-in flex-shrink-0" role="alert">
          {error}
        </div>
      )}

      <div className="flex-1 flex max-w-[1440px] mx-auto w-full animate-fadein min-h-0 overflow-hidden">
        <ChatArea />
        <div className="hidden lg:flex">
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
