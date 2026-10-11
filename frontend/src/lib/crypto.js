// End-to-end encryption for room messages.
//
// Each room has a random AES-GCM 256-bit key, created in the creator's browser
// and shared only inside the invite link's #fragment, which browsers never send
// to the server. Messages are encrypted before they leave the browser, so the
// server stores and relays ciphertext it cannot read.

const webCrypto = globalThis.crypto;

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const toBase64Url = (bytes) =>
  bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return base64ToBytes(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
}

// A 256-bit key is 32 bytes, which is 43 characters of unpadded base64url.
export const isValidKeyString = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

export const randomToken = () => toBase64Url(webCrypto.getRandomValues(new Uint8Array(24)));

export async function generateRoomKey() {
  const key = await webCrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await webCrypto.subtle.exportKey('raw', key);
  return toBase64Url(new Uint8Array(raw));
}

export async function importRoomKey(keyString) {
  if (!isValidKeyString(keyString)) throw new Error('Invalid room key');
  return webCrypto.subtle.importKey('raw', fromBase64Url(keyString), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// Plaintext layout: [4-byte header length][UTF-8 JSON header][optional file bytes].
// Keeping file bytes outside the JSON avoids base64-encoding them twice.
export async function encryptPayload(key, header, fileBytes = null) {
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const plain = new Uint8Array(4 + headerBytes.length + (fileBytes ? fileBytes.length : 0));
  new DataView(plain.buffer).setUint32(0, headerBytes.length);
  plain.set(headerBytes, 4);
  if (fileBytes) plain.set(fileBytes, 4 + headerBytes.length);

  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const encrypted = await webCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

export async function decryptPayload(key, ciphertext, iv) {
  const decrypted = await webCrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  const plain = new Uint8Array(decrypted);
  const headerLength = new DataView(plain.buffer).getUint32(0);
  const header = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + headerLength)));
  const fileBytes = plain.length > 4 + headerLength ? plain.slice(4 + headerLength) : null;
  return { header, fileBytes };
}
