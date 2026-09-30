import { config as loadDotenv } from 'dotenv';

loadDotenv();

type NodeEnv = 'development' | 'test' | 'production';
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/** Collects every problem before throwing, so one boot reports all misconfiguration. */
class EnvValidator {
  private readonly errors: string[] = [];

  required(key: string): string {
    const raw = process.env[key];
    if (raw === undefined || raw.trim() === '') {
      this.errors.push(`${key} is required but was not set`);
      return '';
    }
    return raw.trim();
  }

  optional(key: string, fallback: string): string {
    const raw = process.env[key];
    return raw === undefined || raw.trim() === '' ? fallback : raw.trim();
  }

  int(key: string, fallback: number, min?: number, max?: number): number {
    const raw = process.env[key];
    if (raw === undefined || raw.trim() === '') return fallback;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) {
      this.errors.push(`${key} must be an integer, received "${raw}"`);
      return fallback;
    }
    if (min !== undefined && parsed < min) this.errors.push(`${key} must be >= ${min}`);
    if (max !== undefined && parsed > max) this.errors.push(`${key} must be <= ${max}`);
    return parsed;
  }

  /** Same contract as int(), for the one setting that is a fraction. */
  float(key: string, fallback: number, min?: number, max?: number): number {
    const raw = process.env[key];
    if (raw === undefined || raw.trim() === '') return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      this.errors.push(key + ' must be a number, received "' + raw + '"');
      return fallback;
    }
    if (min !== undefined && parsed < min) this.errors.push(key + ' must be >= ' + min);
    if (max !== undefined && parsed > max) this.errors.push(key + ' must be <= ' + max);
    return parsed;
  }
  bool(key: string, fallback: boolean): boolean {
    const raw = process.env[key];
    if (raw === undefined || raw.trim() === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
  }

  enum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    const raw = (process.env[key] ?? fallback).trim() as T;
    if (!allowed.includes(raw)) {
      this.errors.push(`${key} must be one of: ${allowed.join(', ')} - received "${raw}"`);
      return fallback;
    }
    return raw;
  }

  secret(key: string, minLength = 32): string {
    const value = this.required(key);
    if (value && value.length < minLength) {
      this.errors.push(`${key} must be at least ${minLength} characters`);
    }
    return value;
  }

  assertValid(): void {
    if (this.errors.length > 0) {
      // Deliberately console.error, not the logger: the logger depends on env.
      console.error('\n[FATAL] Environment validation failed:\n');
      for (const error of this.errors) console.error(`  - ${error}`);
      console.error('\nRefer to .env for the full list.\n');
      process.exit(1);
    }
  }
}

const v = new EnvValidator();

const nodeEnv = v.enum<NodeEnv>('NODE_ENV', ['development', 'test', 'production'], 'development');
const isProduction = nodeEnv === 'production';

export const env = {
  nodeEnv,
  isProduction,
  isDevelopment: nodeEnv === 'development',

  port: v.int('PORT', 4000, 1, 65535),
  apiPrefix: v.optional('API_PREFIX', '/api'),

  databaseUrl: v.required('DATABASE_URL'),
  dbPoolMax: v.int('DB_POOL_MAX', 20, 1, 200),
  dbPoolMin: v.int('DB_POOL_MIN', 2, 0, 50),
  dbIdleTimeoutMs: v.int('DB_IDLE_TIMEOUT_MS', 30_000, 1_000),
  dbConnectionTimeoutMs: v.int('DB_CONNECTION_TIMEOUT_MS', 10_000, 1_000),
  dbStatementTimeoutMs: v.int('DB_STATEMENT_TIMEOUT_MS', 15_000, 1_000),
  dbSsl: v.bool('DB_SSL', isProduction),

  jwtAccessSecret: v.secret('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: v.secret('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: v.optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  jwtRefreshExpiresInDays: v.int('JWT_REFRESH_EXPIRES_IN_DAYS', 7, 1, 90),
  jwtIssuer: v.optional('JWT_ISSUER', 'upwon-admin-api'),
  jwtAudience: v.optional('JWT_AUDIENCE', 'upwon-admin-panel'),

  bcryptRounds: v.int('BCRYPT_ROUNDS', 12, 10, 15),
  maxSessionsPerAdmin: v.int('MAX_SESSIONS_PER_ADMIN', 5, 1, 50),
  passwordResetTtlMinutes: v.int('PASSWORD_RESET_TTL_MINUTES', 30, 5, 1440),

  corsOrigin: v
    .required('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  logLevel: v.enum<LogLevel>('LOG_LEVEL', ['DEBUG', 'INFO', 'WARN', 'ERROR'], 'INFO'),

  storageDriver: v.enum('STORAGE_DRIVER', ['LOCAL', 'S3'] as const, 'LOCAL'),
  storageLocalPath: v.optional('STORAGE_LOCAL_PATH', './storage/uploads'),
  storagePublicBaseUrl: v.optional('STORAGE_PUBLIC_BASE_URL', 'http://localhost:4000/files'),
  maxUploadBytes: v.int('MAX_UPLOAD_BYTES', 10 * 1024 * 1024, 1024),

  /**
   * The origin + API prefix this server is reachable at from a browser.
   *
   * Used to build absolute URLs for publicly served uploads, which are
   * embedded in the marketing site's HTML and therefore have to resolve from
   * a different origin than the API's own. Set this to the public API URL in
   * any deployed environment.
   */
  publicApiBaseUrl: v.optional('PUBLIC_API_BASE_URL', 'http://localhost:4000/api'),

  /**
   * Google reCAPTCHA, the server half.
   *
   * Only the SECRET key lives here, and it lives ONLY here. Its pair, the
   * site key, is public by design and is compiled into both front ends -
   * that is what a site key is for. The secret is the thing that proves a
   * token was checked with Google rather than invented, so a copy of it in a
   * Vite .env would be a copy inside the shipped JavaScript bundle, readable
   * by anyone who opens devtools, and every verification the server performs
   * would become forgeable. It does not belong in a front end.
   *
   * Optional rather than required: an unset secret leaves the check switched
   * off (see core/utils/recaptcha.ts) so a fresh clone, CI and the seed
   * scripts still boot. The server logs plainly at startup when it is off.
   */
  recaptchaSecretKey: v.optional('RECAPTCHA_SECRET_KEY', '').trim(),

  /**
   * Only consulted for a v3 (score-based) key, which answers with a 0..1
   * score rather than a yes or no. The keys this project is configured with
   * are v2 checkbox and carry no score, so this sits unused unless they are
   * swapped; 0.5 is Google's own suggested starting point.
   */
  recaptchaMinScore: v.float('RECAPTCHA_MIN_SCORE', 0.5, 0, 1),
  shutdownGraceMs: v.int('SHUTDOWN_GRACE_MS', 15_000, 1_000),
  trustProxy: v.bool('TRUST_PROXY', isProduction),
} as const;

v.assertValid();

// Cross-field checks that only make sense once every value is parsed.
if (env.jwtAccessSecret === env.jwtRefreshSecret) {
  console.error('\n[FATAL] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.\n');
  process.exit(1);
}
if (env.dbPoolMin > env.dbPoolMax) {
  console.error('\n[FATAL] DB_POOL_MIN cannot exceed DB_POOL_MAX.\n');
  process.exit(1);
}

export type Env = typeof env;
