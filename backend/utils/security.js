const crypto = require('crypto');
const { promisify } = require('util');
const { ROOM_CODE_LENGTH, ROOM_CODE_ALPHABET } = require('./constants');

const scrypt = promisify(crypto.scrypt);

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

// Constant-time comparison of two hex strings of any length.
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const hash = await scrypt(password, Buffer.from(saltHex, 'hex'), 64);
  return safeEqualHex(hash.toString('hex'), hashHex);
}

module.exports = { randomToken, sha256, generateRoomCode, safeEqualHex, hashPassword, verifyPassword };
