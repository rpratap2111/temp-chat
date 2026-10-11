import React, { useState, useCallback, useEffect } from 'react'
import Home from './components/Home';
import Room from './components/Room';
import ClosedRoom from './components/ClosedRoom';
import { useSocket } from './context/SocketContext';
import { loadSession, saveSession, clearSession } from './lib/session';
import { parseInvite } from './lib/invite';

// Reads an invite from the address bar, then strips the key from it so it does
// not linger in screenshots, screen shares or browser history.
function takeInviteFromUrl() {
  const invite = parseInvite(window.location.hash);
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return invite;
}

const initialInvite = takeInviteFromUrl();

function App() {
  const { resetRoomState } = useSocket();
  const [session, setSession] = useState(() => (initialInvite ? null : loadSession()));
  const [view, setView] = useState(() => (session ? 'room' : 'home'));
  const [invite, setInvite] = useState(initialInvite);
  // Shown on the home screen after the user is sent back, e.g. "wrong password".
  const [notice, setNotice] = useState('');
  const [closedInfo, setClosedInfo] = useState(null);

  // An invite link opened in a tab that already has the app loaded only changes
  // the URL fragment, which does not reload the page.
  useEffect(() => {
    const onHashChange = () => {
      const next = takeInviteFromUrl();
      if (!next || view === 'room') return;
      resetRoomState();
      setInvite(next);
      setNotice('');
      setView('home');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [view, resetRoomState]);

  const enterRoom = useCallback((nextSession) => {
    saveSession(nextSession);
    setSession(nextSession);
    setNotice('');
    setView('room');
  }, []);

  // keepInvite lets the user retry the same room, e.g. after a wrong password.
  const goHome = useCallback((message = '', { keepInvite = false } = {}) => {
    clearSession();
    resetRoomState();
    setInvite(keepInvite && session ? { roomCode: session.roomCode, key: session.key } : null);
    setSession(null);
    setNotice(message);
    setView('home');
  }, [resetRoomState, session]);

  const showClosed = useCallback((info) => {
    clearSession();
    setClosedInfo(info);
    setSession(null);
    setView('closed');
  }, []);

  const leaveClosed = useCallback(() => {
    resetRoomState();
    setClosedInfo(null);
    setNotice('');
    setView('home');
  }, [resetRoomState]);

  return (
    <div className="min-h-screen bg-gray-100">
      {view === 'room' && session && (
        <Room session={session} onLeave={goHome} onClosed={showClosed} />
      )}
      {view === 'closed' && closedInfo && (
        <ClosedRoom info={closedInfo} onDone={leaveClosed} />
      )}
      {view === 'home' && (
        <Home
          key={invite ? `${invite.roomCode}:${invite.key}` : 'home'}
          onEnterRoom={enterRoom}
          invite={invite}
          notice={notice}
        />
      )}
    </div>
  )
}

export default App;
