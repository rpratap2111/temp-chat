// The current room session lives in sessionStorage so a page refresh rejoins
// the same room with the same seat. It is per-tab and cleared when the tab closes.
//
// Shape: { roomCode, key, username, memberToken, hostToken?, password? }

const STORAGE_KEY = 'tempchat.session';
const LAST_NAME_KEY = 'tempchat.lastUsername';

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(LAST_NAME_KEY, session.username);
  } catch {
    // Storage blocked: the session still works until the page is refreshed.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function loadLastUsername() {
  try {
    return localStorage.getItem(LAST_NAME_KEY) || '';
  } catch {
    return '';
  }
}
