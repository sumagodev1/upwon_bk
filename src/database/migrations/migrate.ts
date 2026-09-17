import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { closePool, pool } from '../../config/database';
import { logger } from '../../core/utils/logger';

const MIGRATIONS_DIR = __dirname;

/**
 * Forward-only migration runner.
 *
 * Run as a deploy step BEFORE the new application code starts - never at
 * application boot, where N nodes would race each other.
 *
 * Each migration runs in its own transaction together with the insert into
 * schema_migrations, so a failed migration is never recorded as applied.
 */

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     VARCHAR(255) PRIMARY KEY,
      applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `);
}

async function appliedVersions(): Promise<Set<string>> {
  const result = await pool.query<{ version: string }>(
    'SELECT version FROM schema_migrations',
  );
  return new Set(result.rows.map((row) => row.version));
}

async function pendingMigrations(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  const applied = await appliedVersions();

  return entries
    .filter((entry) => entry.endsWith('.sql'))
    .sort()
    .filter((entry) => !applied.has(entry));
}

async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const pending = await pendingMigrations();

  if (pending.length === 0) {
    logger.info('No pending migrations');
    return;
  }

  logger.info('Applying migrations', { count: pending.length, files: pending });

  for (const file of pending) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info('Migration applied', { file });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      logger.error('Migration failed - rolled back', {
        file,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  logger.info('All migrations applied', { count: pending.length });
}

async function showStatus(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await appliedVersions();
  const entries = (await readdir(MIGRATIONS_DIR))
    .filter((entry) => entry.endsWith('.sql'))
    .sort();

  console.log('\nMigration status:\n');
  for (const entry of entries) {
    console.log(`  ${applied.has(entry) ? '[applied]' : '[pending]'}  ${entry}`);
  }
  console.log('');
}

async function main(): Promise<void> {
  try {
    if (process.argv.includes('--status')) {
      await showStatus();
    } else {
      await runMigrations();
    }
    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Migration run aborted', { message: (error as Error).message });
    await closePool().catch(() => undefined);
    process.exit(1);
  }
}

void main();
