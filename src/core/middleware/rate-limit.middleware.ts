import { Request, RequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Composite key builder. Defaults to the client IP. */
  keyGenerator?: (req: Request) => string;
  message?: string;
  /** Do not count requests that succeeded - used for login. */
  skipSuccessfulRequests?: boolean;
}

/**
 * IN-MEMORY, PER-PROCESS RATE LIMITER.
 *
 * ── SCALING LIMITATION - READ BEFORE DEPLOYING BEHIND A LOAD BALANCER ──
 *
 * State lives in this process's heap. With N application instances behind a
 * load balancer, a client can issue up to N x max requests per window, because
 * each instance counts only what it sees. Sticky sessions narrow but do not
 * close this gap.
 *
 * This is acceptable for a single-instance admin panel - the traffic profile is
 * a handful of internal users - and it is a genuine weakness the moment a second
 * instance exists.
 *
 * MIGRATION PATH: replace the `buckets` Map with a shared atomic counter
 * (Redis INCR + EXPIRE, or an UNLOGGED PostgreSQL table with an upsert and a
 * TTL sweep). The RateLimitOptions interface and every call site stay
 * unchanged; only the `hit()` method below is replaced.
 */
class MemoryRateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor(sweepIntervalMs = 60_000) {
    // unref() so this timer never keeps the process alive during shutdown.
    const timer = setInterval(() => this.sweep(), sweepIntervalMs);
    timer.unref();
  }

  hit(key: string, windowMs: number): Bucket {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const fresh: Bucket = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }

    existing.count += 1;
    return existing;
  }

  decrement(key: string): void {
    const bucket = this.buckets.get(key);
    if (bucket && bucket.count > 0) bucket.count -= 1;
  }

  private sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
        removed += 1;
      }
    }
    if (removed > 0) {
      logger.debug('Rate limit buckets swept', { removed, remaining: this.buckets.size });
    }
  }
}

const store = new MemoryRateLimitStore();

export function rateLimit(options: RateLimitOptions): RequestHandler {
  const {
    windowMs,
    max,
    keyGenerator = (req: Request) => req.ip ?? 'unknown',
    message = 'Too many requests. Please try again later.',
    skipSuccessfulRequests = false,
  } = options;

  return (req, res, next) => {
    const key = `${req.method}:${req.baseUrl}${req.path}:${keyGenerator(req)}`;
    const bucket = store.hit(key, windowMs);
    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - Date.now()) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (bucket.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      logger.warn('Rate limit exceeded', {
        requestId: req.requestId,
        route: `${req.baseUrl}${req.path}`,
        ip: req.ip,
      });
      return next(new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'));
    }

    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400) store.decrement(key);
      });
    }

    next();
  };
}

export const globalRateLimit = rateLimit({ windowMs: 60_000, max: 300 });

export const standardRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

/** Keyed on IP + email so one attacker cannot lock out every account from one IP. */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const body = req.body as { email?: unknown } | undefined;
    const email =
      typeof body?.email === 'string' ? body.email.toLowerCase().slice(0, 120) : 'unknown';
    return `${req.ip}:${email}`;
  },
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60_000,
  max: 3,
  message: 'Too many password reset requests. Please try again later.',
});

export const resetPasswordRateLimit = rateLimit({ windowMs: 60 * 60_000, max: 5 });
export const refreshRateLimit = rateLimit({ windowMs: 15 * 60_000, max: 30 });
export const uploadRateLimit = rateLimit({ windowMs: 15 * 60_000, max: 30 });
