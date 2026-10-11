import { ROOM_CODE_REGEX } from '../config';
import { isValidKeyString } from './crypto';

// Invite links carry the room code and the encryption key in the URL fragment:
//   https://example.com/#r=ABCD2345&k=<key>
// Everything after "#" stays in the browser and is never sent to any server.

export function buildInviteLink({ roomCode, key }) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#r=${roomCode}&k=${key}`;
}

// Accepts a full invite link or just its fragment. Returns { roomCode, key } or null.
export function parseInvite(input) {
  if (typeof input !== 'string' || !input.trim()) return null;
  const text = input.trim();
  const hashIndex = text.indexOf('#');
  const fragment = hashIndex >= 0 ? text.slice(hashIndex + 1) : text;

  const params = new URLSearchParams(fragment);
  const roomCode = (params.get('r') || '').toUpperCase();
  const key = params.get('k') || '';
  if (!ROOM_CODE_REGEX.test(roomCode) || !isValidKeyString(key)) return null;
  return { roomCode, key };
}
