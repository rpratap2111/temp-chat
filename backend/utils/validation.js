const { ROOM_CODE_REGEX, USERNAME_MAX_LENGTH } = require('./constants');

const TOKEN_REGEX = /^[A-Za-z0-9_-]{16,128}$/;
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

// Returns the normalised (upper-cased) room code, or null when invalid.
function normalizeRoomCode(roomCode) {
  if (typeof roomCode !== 'string') return null;
  const code = roomCode.trim().toUpperCase();
  return ROOM_CODE_REGEX.test(code) ? code : null;
}

// Returns the trimmed username, or null when empty, too long or reserved.
function normalizeUsername(username) {
  if (typeof username !== 'string') return null;
  const name = username.trim();
  if (!name || name.length > USERNAME_MAX_LENGTH) return null;
  if (name.toLowerCase() === 'system') return null;
  return name;
}

// Client-generated session tokens are URL-safe random strings.
function normalizeToken(token) {
  return typeof token === 'string' && TOKEN_REGEX.test(token) ? token : null;
}

function isBase64(value, maxLength) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength
    && BASE64_REGEX.test(value);
}

module.exports = { normalizeRoomCode, normalizeUsername, normalizeToken, isBase64 };
