/**
 * Browser-native password hashing via Web Crypto (PBKDF2 + SHA-256).
 * No npm dependencies — works in every modern browser out of the box.
 *
 * Hash format:  "pbkdf2:<saltBase64>:<hashBase64>"
 */

const ITERATIONS = 120_000;
const KEY_LENGTH = 256; // bits

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  // Use a plain ArrayBuffer copy to satisfy TypeScript's strict BufferSource type
  const saltBuf = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(saltBuf), iterations: ITERATIONS },
    keyMaterial,
    KEY_LENGTH,
  );
  return toBase64(bits);
}

/** Hash a plaintext password. Returns a storable string. */
export async function hashPassword(password: string): Promise<string> {
  const saltArr = crypto.getRandomValues(new Uint8Array(16));
  const saltBuf = saltArr.buffer.slice(0) as ArrayBuffer;
  const hash = await deriveKey(password, new Uint8Array(saltBuf));
  return `pbkdf2:${toBase64(saltBuf)}:${hash}`;
}

/** Verify a plaintext password against a stored hash string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) return false;
  const [, saltB64, storedHash] = stored.split(':');
  const salt = fromBase64(saltB64);
  const hash = await deriveKey(password, salt);
  return hash === storedHash;
}
