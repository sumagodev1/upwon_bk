import bcrypt from 'bcrypt';
import { env } from '../../config/env';

/**
 * A real bcrypt hash of a value nobody knows.
 *
 * Compared against when a login is attempted for an email that does not exist,
 * so the response time for "unknown email" matches "wrong password". Without
 * it, a ~150ms difference turns the login endpoint into a user-enumeration
 * oracle that no rate limit fully closes.
 */
export const DUMMY_PASSWORD_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7Fq3vD3nJ4rmZLW3wCJmzL3mVJHmpvW';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Burns the same time as a real verification, then always fails. */
export async function verifyAgainstDummy(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_PASSWORD_HASH);
}
