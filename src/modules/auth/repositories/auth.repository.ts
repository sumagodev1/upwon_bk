// src/modules/auth/repositories/auth.repository.ts

import { Executor, runQuery } from '../../../config/database';
import {
  AdminSession,
  CreateSessionInput,
  PasswordResetToken,
} from '../types/auth.types';

const SESSION_COLUMNS = `
  id, admin_id, device_name, user_agent, ip_address::text AS ip_address,
  expires_at, revoked_at, replaced_by, created_at
`;

interface SessionRow {
  id: string;
  admin_id: string;
  device_name: string | null;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
  created_at: Date;
}

const toSession = (row: SessionRow): AdminSession => ({
  id: row.id,
  adminId: row.admin_id,
  deviceName: row.device_name,
  userAgent: row.user_agent,
  ipAddress: row.ip_address,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  replacedBy: row.replaced_by,
  createdAt: row.created_at,
});

// ── sessions ───────────────────────────────────────────────────────────────

export const createSession = async (
  input: CreateSessionInput,
  executor?: Executor,
): Promise<AdminSession> => {
  const sql = `
    INSERT INTO admin_sessions
      (admin_id, refresh_token_hash, device_name, user_agent, ip_address, expires_at)
    VALUES ($1, $2, $3, $4, $5::inet, $6)
    RETURNING ${SESSION_COLUMNS}
  `;
  const result = await runQuery<SessionRow>(executor, sql, [
    input.adminId,
    input.refreshTokenHash,
    input.deviceName,
    input.userAgent,
    input.ipAddress,
    input.expiresAt,
  ]);
  return toSession(result.rows[0]);
};

/**
 * Looks up by hash INCLUDING revoked and expired rows.
 *
 * This is deliberate: the service must be able to distinguish "unknown token"
 * from "revoked token". Filtering revoked rows here would silently discard the
 * reuse-detection signal, which is the entire security value of rotation.
 */
export const findSessionByTokenHash = async (
  refreshTokenHash: string,
  executor?: Executor,
): Promise<AdminSession | null> => {
  const sql = `
    SELECT ${SESSION_COLUMNS}
      FROM admin_sessions
     WHERE refresh_token_hash = $1
  `;
  const result = await runQuery<SessionRow>(executor, sql, [refreshTokenHash]);
  return result.rows[0] ? toSession(result.rows[0]) : null;
};

/** Locks the session row so two concurrent refreshes cannot both rotate it. */
export const findSessionByTokenHashForUpdate = async (
  refreshTokenHash: string,
  executor: Executor,
): Promise<AdminSession | null> => {
  const sql = `
    SELECT ${SESSION_COLUMNS}
      FROM admin_sessions
     WHERE refresh_token_hash = $1
       FOR UPDATE
  `;
  const result = await runQuery<SessionRow>(executor, sql, [refreshTokenHash]);
  return result.rows[0] ? toSession(result.rows[0]) : null;
};

export const findSessionById = async (
  id: string,
  executor?: Executor,
): Promise<AdminSession | null> => {
  const sql = `SELECT ${SESSION_COLUMNS} FROM admin_sessions WHERE id = $1`;
  const result = await runQuery<SessionRow>(executor, sql, [id]);
  return result.rows[0] ? toSession(result.rows[0]) : null;
};

export const listActiveSessions = async (
  adminId: string,
  executor?: Executor,
): Promise<AdminSession[]> => {
  const sql = `
    SELECT ${SESSION_COLUMNS}
      FROM admin_sessions
     WHERE admin_id = $1
       AND revoked_at IS NULL
       AND expires_at > now()
     ORDER BY created_at DESC
  `;
  const result = await runQuery<SessionRow>(executor, sql, [adminId]);
  return result.rows.map(toSession);
};

export const revokeSession = async (
  id: string,
  replacedBy: string | null,
  executor?: Executor,
): Promise<boolean> => {
  const sql = `
    UPDATE admin_sessions
       SET revoked_at = now(), replaced_by = $2
     WHERE id = $1 AND revoked_at IS NULL
  `;
  const result = await runQuery(executor, sql, [id, replacedBy]);
  return (result.rowCount ?? 0) > 0;
};

export const revokeAllSessions = async (
  adminId: string,
  executor?: Executor,
): Promise<number> => {
  const sql = `
    UPDATE admin_sessions
       SET revoked_at = now()
     WHERE admin_id = $1 AND revoked_at IS NULL
  `;
  const result = await runQuery(executor, sql, [adminId]);
  return result.rowCount ?? 0;
};

export const revokeAllSessionsExcept = async (
  adminId: string,
  keepSessionId: string,
  executor?: Executor,
): Promise<number> => {
  const sql = `
    UPDATE admin_sessions
       SET revoked_at = now()
     WHERE admin_id = $1 AND id <> $2 AND revoked_at IS NULL
  `;
  const result = await runQuery(executor, sql, [adminId, keepSessionId]);
  return result.rowCount ?? 0;
};

/**
 * Enforces MAX_SESSIONS_PER_ADMIN by revoking the oldest live sessions.
 * Done in one statement - a SELECT-then-UPDATE would race with a concurrent
 * login from another device.
 */
export const revokeOldestSessionsBeyondLimit = async (
  adminId: string,
  limit: number,
  executor: Executor,
): Promise<number> => {
  const sql = `
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY created_at DESC) AS position
        FROM admin_sessions
       WHERE admin_id = $1
         AND revoked_at IS NULL
         AND expires_at > now()
    )
    UPDATE admin_sessions s
       SET revoked_at = now()
      FROM ranked
     WHERE s.id = ranked.id
       AND ranked.position >= $2
  `;
  const result = await runQuery(executor, sql, [adminId, limit]);
  return result.rowCount ?? 0;
};

/** Housekeeping - run on a schedule. Revoked rows are kept for the audit window. */
export const deleteExpiredSessions = async (retentionDays: number): Promise<number> => {
  const sql = `
    DELETE FROM admin_sessions
     WHERE expires_at < now() - ($1::int * INTERVAL '1 day')
  `;
  const result = await runQuery(undefined, sql, [retentionDays]);
  return result.rowCount ?? 0;
};

// ── password reset ─────────────────────────────────────────────────────────

export const createPasswordResetToken = async (
  adminId: string,
  tokenHash: string,
  expiresAt: Date,
  executor?: Executor,
): Promise<PasswordResetToken> => {
  const sql = `
    INSERT INTO password_reset_tokens (admin_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, admin_id, expires_at, used_at, created_at
  `;
  const result = await runQuery<{
    id: string;
    admin_id: string;
    expires_at: Date;
    used_at: Date | null;
    created_at: Date;
  }>(executor, sql, [adminId, tokenHash, expiresAt]);

  const row = result.rows[0];
  return {
    id: row.id,
    adminId: row.admin_id,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
};

/**
 * Single-use consumption in one atomic statement.
 *
 * The WHERE clause and the UPDATE are the same operation, so two concurrent
 * requests carrying the same token cannot both succeed - the second matches
 * zero rows. A SELECT-then-UPDATE here would allow a double reset.
 */
export const consumePasswordResetToken = async (
  tokenHash: string,
  executor: Executor,
): Promise<{ adminId: string } | null> => {
  const sql = `
    UPDATE password_reset_tokens
       SET used_at = now()
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > now()
    RETURNING admin_id
  `;
  const result = await runQuery<{ admin_id: string }>(executor, sql, [tokenHash]);
  return result.rows[0] ? { adminId: result.rows[0].admin_id } : null;
};

/** Issuing a new reset link invalidates any outstanding ones. */
export const invalidateOutstandingResetTokens = async (
  adminId: string,
  executor?: Executor,
): Promise<number> => {
  const sql = `
    UPDATE password_reset_tokens
       SET used_at = now()
     WHERE admin_id = $1 AND used_at IS NULL
  `;
  const result = await runQuery(executor, sql, [adminId]);
  return result.rowCount ?? 0;
};

export const deleteExpiredResetTokens = async (): Promise<number> => {
  const sql = `DELETE FROM password_reset_tokens WHERE expires_at < now() - INTERVAL '7 days'`;
  const result = await runQuery(undefined, sql, []);
  return result.rowCount ?? 0;
};
