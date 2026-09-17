import { env } from '../../config/env';

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVEL_WEIGHT: Record<Level, number> = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

/**
 * Any key matching one of these is replaced with '[REDACTED]' before output,
 * at any depth. This is a backstop, not a licence to pass secrets to the
 * logger - the primary rule is still "do not log them".
 */
const REDACTED_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'refreshtokenhash',
  'tokenhash',
  'authorization',
  'cookie',
  'setcookie',
  'apikey',
  'keyhash',
  'secret',
  'jwt',
]);

const MAX_DEPTH = 6;

function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[MAX_DEPTH]';
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Set) return [...value];
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    output[key] = REDACTED_KEYS.has(key.toLowerCase().replace(/[-_]/g, ''))
      ? '[REDACTED]'
      : redact(nested, depth + 1);
  }
  return output;
}

class Logger {
  private readonly threshold = LEVEL_WEIGHT[env.logLevel];

  private write(level: Level, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_WEIGHT[level] < this.threshold) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'upwon-admin-api',
      env: env.nodeEnv,
      message,
      ...(meta ? (redact(meta) as Record<string, unknown>) : {}),
    };

    // Single-line JSON in production so log shippers can parse it;
    // indented in development so humans can read it.
    const serialized = env.isProduction
      ? JSON.stringify(entry)
      : JSON.stringify(entry, null, 2);

    if (level === 'ERROR') console.error(serialized);
    else if (level === 'WARN') console.warn(serialized);
    else console.log(serialized);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write('DEBUG', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write('INFO', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('WARN', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write('ERROR', message, meta);
  }
}

export const logger = new Logger();
