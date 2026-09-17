import { Pool, PoolClient, QueryResult, QueryResultRow, types } from 'pg';
import { env } from './env';
import { logger } from '../core/utils/logger';
import { DatabaseError } from '../core/errors/DatabaseError';

/**
 * pg returns int8 (BIGINT) as a string to avoid precision loss. Every COUNT(*)
 * in this codebase is safely below 2^53, so parsing it here removes a Number()
 * call from every aggregate mapping.
 *
 * NUMERIC (oid 1700) is deliberately NOT parsed - money must not become a float.
 */
types.setTypeParser(types.builtins.INT8, (value: string) => parseInt(value, 10));

export interface Executor {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.dbPoolMax,
  min: env.dbPoolMin,
  idleTimeoutMillis: env.dbIdleTimeoutMs,
  connectionTimeoutMillis: env.dbConnectionTimeoutMs,
  // Server-side guard: a runaway query cannot hold a pool slot indefinitely.
  statement_timeout: env.dbStatementTimeoutMs,
  query_timeout: env.dbStatementTimeoutMs,
  application_name: 'upwon-admin-api',
  ssl: env.dbSsl ? { rejectUnauthorized: false } : undefined,
});

/**
 * Idle clients can fail (network blip, server restart). Without this handler
 * the error is emitted on the Pool with no listener and crashes the process.
 */
pool.on('error', (error: Error) => {
  logger.error('Unexpected error on idle PostgreSQL client', { message: error.message });
});

pool.on('connect', () => {
  logger.debug('PostgreSQL client connected', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
});

/** Slow-query visibility without an APM agent. */
const SLOW_QUERY_MS = 500;

export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<R>> {
  const startedAt = process.hrtime.bigint();
  try {
    const result = await pool.query<R>(text, values);
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    if (durationMs > SLOW_QUERY_MS) {
      logger.warn('Slow query', {
        durationMs: Math.round(durationMs),
        rowCount: result.rowCount,
        // First line only - never the parameter values.
        sql: text.trim().split('\n')[0].slice(0, 160),
      });
    }
    return result;
  } catch (error) {
    throw DatabaseError.from(error, text);
  }
}

/**
 * Resolves to the caller's transaction client when one is passed, or the pool
 * when standalone. Every repository function funnels through this so a
 * repository can participate in a caller's transaction without knowing about it.
 */
export async function runQuery<R extends QueryResultRow = QueryResultRow>(
  executor: Executor | undefined,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<R>> {
  if (executor && executor !== (pool as unknown as Executor)) {
    return executor.query<R>(text, values);
  }
  return query<R>(text, values);
}

export interface TransactionOptions {
  /** Reuse an in-flight transaction instead of opening a nested one. */
  existingClient?: PoolClient;
  isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
}

/**
 * Runs `work` inside a transaction. Commits on resolve, rolls back on throw,
 * and always releases the client.
 *
 * Composability: passing `existingClient` runs `work` on that client without
 * opening a second transaction, so a service method that manages its own
 * transaction can still be called from within a larger one.
 */
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  if (options.existingClient) {
    return work(options.existingClient);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (options.isolationLevel) {
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
    }
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // The connection is likely dead; log and continue to surface the original error.
      logger.error('Transaction rollback failed', {
        message: (rollbackError as Error).message,
      });
    }
    throw error instanceof Error ? DatabaseError.from(error) : error;
  } finally {
    client.release();
  }
}

export interface DatabaseHealth {
  healthy: boolean;
  latencyMs: number;
  pool: { total: number; idle: number; waiting: number };
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startedAt = Date.now();
  const poolStats = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
  try {
    await pool.query('SELECT 1');
    return { healthy: true, latencyMs: Date.now() - startedAt, pool: poolStats };
  } catch {
    return { healthy: false, latencyMs: Date.now() - startedAt, pool: poolStats };
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('PostgreSQL pool closed');
}
