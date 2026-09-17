import { AppError } from './AppError';
import { ConflictError } from './ConflictError';
import { ValidationError } from './ValidationError';

interface PgError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

/**
 * Maps a database constraint name to a message the client can act on.
 * Anything not listed here degrades to a generic conflict - a constraint
 * name must never reach the client, because it leaks the schema.
 */
const CONSTRAINT_MESSAGES: Record<string, { message: string; code: string }> = {
  admins_email_unique_live: {
    message: 'An admin with this email already exists',
    code: 'EMAIL_TAKEN',
  },
  organizations_slug_unique_live: {
    message: 'An organization with this slug already exists',
    code: 'SLUG_TAKEN',
  },
  roles_name_key: {
    message: 'A role with this name already exists',
    code: 'ROLE_NAME_TAKEN',
  },
  plans_code_key: {
    message: 'A plan with this code already exists',
    code: 'PLAN_CODE_TAKEN',
  },
  settings_key_key: {
    message: 'A setting with this key already exists',
    code: 'SETTING_KEY_TAKEN',
  },
  subscriptions_one_live_per_org: {
    message: 'This organization already has an active subscription',
    code: 'SUBSCRIPTION_EXISTS',
  },
  api_keys_key_hash_key: {
    message: 'API key collision - please retry',
    code: 'KEY_COLLISION',
  },
  admin_sessions_refresh_token_hash_key: {
    message: 'Session conflict - please retry',
    code: 'SESSION_CONFLICT',
  },
  files_storage_key_key: {
    message: 'A file with this storage key already exists',
    code: 'STORAGE_KEY_TAKEN',
  },
  permissions_key_key: {
    message: 'A permission with this key already exists',
    code: 'PERMISSION_KEY_TAKEN',
  },
};

export class DatabaseError extends AppError {
  constructor(message = 'A database error occurred', details?: unknown) {
    // isOperational = false: this is never the client's fault, always ours.
    super(message, 500, 'DATABASE_ERROR', details, false);
  }

  /**
   * Converts a raw pg error into the appropriate application error.
   * Known SQLSTATEs become client-actionable 4xx errors; everything else
   * becomes an opaque 500 with the real cause logged server-side only.
   */
  static from(error: unknown, sql?: string): AppError {
    if (error instanceof AppError) return error;

    const pgError = error as PgError;

    switch (pgError.code) {
      case '23505': {
        // unique_violation
        const mapped = pgError.constraint ? CONSTRAINT_MESSAGES[pgError.constraint] : undefined;
        return new ConflictError(
          mapped?.message ?? 'A record with these values already exists',
          mapped?.code ?? 'DUPLICATE_ENTRY',
        );
      }
      case '23503': // foreign_key_violation
        return new ValidationError('Referenced record does not exist', [
          {
            field: pgError.column ?? 'reference',
            message: 'Referenced record does not exist',
            code: 'FK_VIOLATION',
          },
        ]);
      case '23514': // check_violation
        return new ValidationError('A value violates a database constraint', [
          { field: pgError.column ?? 'value', message: 'Invalid value', code: 'CHECK_VIOLATION' },
        ]);
      case '23502': // not_null_violation
        return new ValidationError('A required field is missing', [
          { field: pgError.column ?? 'field', message: 'This field is required', code: 'REQUIRED' },
        ]);
      case '22P02': // invalid_text_representation, e.g. malformed UUID
        return new ValidationError('Malformed identifier', [
          { field: 'id', message: 'Invalid format', code: 'INVALID_FORMAT' },
        ]);
      case '57014': // query_canceled - statement_timeout fired
        return new AppError(
          'The operation took too long and was cancelled',
          503,
          'QUERY_TIMEOUT',
          undefined,
          true,
        );
      case '40001': // serialization_failure
        return new AppError(
          'Conflicting concurrent update - please retry',
          409,
          'CONCURRENCY_CONFLICT',
        );
      case '53300': // too_many_connections
        return new AppError(
          'Service temporarily unavailable',
          503,
          'SERVICE_UNAVAILABLE',
          undefined,
          false,
        );
      default:
        // The SQL text and SQLSTATE go to `details`, which the error middleware
        // logs but NEVER serializes to the client in production.
        return new DatabaseError('A database error occurred', {
          sqlState: pgError.code,
          constraint: pgError.constraint,
          table: pgError.table,
          sql: sql?.trim().split('\n')[0].slice(0, 200),
          originalMessage: pgError.message,
        });
    }
  }
}
