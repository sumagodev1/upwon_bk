import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthenticationError } from '../errors/AuthenticationError';
import { generateSecureToken, hmacSha256 } from './crypto';

export interface AccessTokenPayload extends JwtPayload {
  sub: string; // admin id
  sid: string; // session id - lets logout invalidate a specific token family
  email: string;
  roles: string[]; // fast-path hint only; permissions are always re-read from the DB
  type: 'access';
}

export function signAccessToken(input: {
  adminId: string;
  sessionId: string;
  email: string;
  roles: string[];
}): { token: string; expiresIn: string } {
  const options: SignOptions = {
    expiresIn: env.jwtAccessExpiresIn as SignOptions['expiresIn'],
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    algorithm: 'HS256',
  };

  const token = jwt.sign(
    {
      sub: input.adminId,
      sid: input.sessionId,
      email: input.email,
      roles: input.roles,
      type: 'access',
    },
    env.jwtAccessSecret,
    options,
  );

  return { token, expiresIn: env.jwtAccessExpiresIn };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret, {
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      // Pinning the algorithm is mandatory. Without it, a token signed with
      // alg:"none" - or an RS256 token verified against the public key as an
      // HMAC secret - can be accepted.
      algorithms: ['HS256'],
    }) as AccessTokenPayload;

    // A refresh token must never be usable as an access token.
    if (decoded.type !== 'access') {
      throw new AuthenticationError('Invalid token type', 'INVALID_TOKEN');
    }
    return decoded;
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      // Distinct code so the SPA knows to call /auth/refresh rather than
      // bouncing the user to the login screen.
      throw new AuthenticationError('Access token expired', 'TOKEN_EXPIRED');
    }
    throw new AuthenticationError('Invalid access token', 'INVALID_TOKEN');
  }
}

/** Opaque, high-entropy, not a JWT - a refresh token carries no claims. */
export function generateRefreshToken(): string {
  return generateSecureToken(32);
}

/** The only value ever written to admin_sessions.refresh_token_hash. */
export function hashRefreshToken(raw: string): string {
  return hmacSha256(raw, env.jwtRefreshSecret);
}

export function refreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + env.jwtRefreshExpiresInDays);
  return expiry;
}
