import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** 256 bits of entropy, URL-safe. Used for refresh tokens, reset tokens, API keys. */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Keyed hash for values stored in the database.
 *
 * A plain SHA-256 of a 256-bit random token is already infeasible to reverse,
 * so the key is defence-in-depth rather than the primary protection: an
 * attacker with read access to admin_sessions still cannot produce a valid
 * lookup value without the application secret, and cannot inject a row whose
 * hash matches a token they hold.
 */
export function hmacSha256(value: string, key: string): string {
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}

/** Constant-time comparison for two hex digests. */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
