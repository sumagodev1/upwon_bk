// src/core/utils/recaptcha.ts

import { env } from '../../config/env';
import { logger } from './logger';

/**
 * Google's verification endpoint. The only place the secret key is ever sent.
 *
 * Deliberately google.com rather than recaptcha.net: both work, and the site
 * keys were issued against the former. If this server is ever deployed where
 * google.com is unreachable, recaptcha.net is the documented drop-in and this
 * constant is the only change needed.
 */
const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * A visitor on a slow connection is worth waiting a few seconds for; a Google
 * outage is not worth holding a login open for. Past this the answer is
 * "could not verify", which is a different thing from "failed".
 */
const TIMEOUT_MS = 5_000;

/**
 * A token is a base64-ish blob of roughly 500-2000 characters. Anything far
 * past that is not a token, and there is no reason to spend a round trip to
 * Google to find that out.
 */
const MAX_TOKEN_LENGTH = 5_000;

/**
 * Whether the server is actually checking tokens.
 *
 * With no secret configured the check is off: a protected form still submits,
 * it is simply unprotected. That is the right default for a fresh clone, CI
 * and the seed scripts, and the wrong one for production - which is why the
 * server says so out loud at boot rather than leaving it to be noticed.
 */
export const recaptchaEnabled = (): boolean => env.recaptchaSecretKey !== '';

/**
 * The siteverify response, as documented by Google.
 *
 * `score` and `action` appear only for a v3 key; a v2 key omits them. Both are
 * handled because the site key can be swapped in the Google console without
 * touching this code, and a verification that silently stopped checking the
 * score would be the worst possible way for that to go wrong.
 */
interface SiteverifyResponse {
  success?: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export type RecaptchaOutcome =
  /** Google said yes - and for v3, the score cleared the floor. */
  | { ok: true }
  /** Google said no: missing, stale, already spent, or forged. */
  | { ok: false; reason: 'rejected'; codes: string[] }
  /** Google could not be reached, or the secret is wrong. Not the visitor's fault. */
  | { ok: false; reason: 'unavailable'; codes: string[] };

/**
 * Verifies one reCAPTCHA token with Google.
 *
 * Returns an outcome rather than throwing, because the two failures deserve
 * different answers and only the caller knows which it wants: a rejected token
 * is the visitor's problem and should stop the request, while an unreachable
 * Google is this server's problem and refusing every login over it would be a
 * self-inflicted outage. The middleware applies the policy.
 *
 * `remoteIp` is optional in Google's API and passed when known; it sharpens
 * their scoring and is used here for nothing else.
 */
export const verifyRecaptchaToken = async (
  token: unknown,
  remoteIp?: string | null,
): Promise<RecaptchaOutcome> => {
  if (!recaptchaEnabled()) return { ok: true };

  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (trimmed === '' || trimmed.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'rejected', codes: ['invalid-input-response'] };
  }

  const body = new URLSearchParams({
    secret: env.recaptchaSecretKey,
    response: trimmed,
  });
  // A malformed address is worse than an absent one, so it is only sent when
  // the caller has a real one.
  if (remoteIp) body.set('remoteip', remoteIp);

  let payload: SiteverifyResponse;
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      logger.warn('reCAPTCHA siteverify returned a non-2xx status', { status: res.status });
      return { ok: false, reason: 'unavailable', codes: [`http-${res.status}`] };
    }
    payload = (await res.json()) as SiteverifyResponse;
  } catch (error) {
    // A timeout, a DNS failure, an unparseable body. Never the token's fault.
    logger.warn('reCAPTCHA siteverify could not be reached', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: 'unavailable', codes: ['unreachable'] };
  }

  const codes = Array.isArray(payload['error-codes']) ? payload['error-codes'] : [];

  /*
   * Two of Google's codes are about this server, not the visitor, and telling
   * them apart matters: a wrong or missing secret makes every submission fail,
   * and reporting that as "you failed the captcha" would send an operator
   * hunting through the front end for a fault that is in .env.
   */
  if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
    logger.error('reCAPTCHA secret key is missing or invalid - verification cannot succeed', {
      codes,
    });
    return { ok: false, reason: 'unavailable', codes };
  }

  if (payload.success !== true) return { ok: false, reason: 'rejected', codes };

  /*
   * v3 only. A v2 checkbox response carries no score, and treating its absence
   * as zero would reject every valid submission - hence the explicit typeof
   * rather than a truthiness test or a `?? 0` default.
   */
  if (typeof payload.score === 'number' && payload.score < env.recaptchaMinScore) {
    return { ok: false, reason: 'rejected', codes: ['low-score'] };
  }

  return { ok: true };
};
