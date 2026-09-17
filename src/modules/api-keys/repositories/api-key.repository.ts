// src/modules/api-keys/repositories/api-key.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ApiKeyStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { ApiKey, ApiKeyWithScopes, ResolvedApiKey } from '../types/api-key.types';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  status: string;
  created_by: string | null;
  last_used_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

const toApiKey = (row: ApiKeyRow): ApiKey => ({
  id: row.id,
  name: row.name,
  keyPrefix: row.key_prefix,
  status: row.status as ApiKeyStatus,
  createdBy: row.created_by,
  lastUsedAt: row.last_used_at,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  createdAt: row.created_at,
});

// key_hash is never selected into any read path.
const COLUMNS = `
  ak.id, ak.name, ak.key_prefix, ak.status, ak.created_by,
  ak.last_used_at, ak.expires_at, ak.revoked_at, ak.created_at
`;

const SCOPES_AGG = `
  COALESCE(
    (SELECT json_agg(p.key ORDER BY p.key)
       FROM api_key_scopes aks
       JOIN permissions p ON p.id = aks.permission_id
      WHERE aks.api_key_id = ak.id),
    '[]'
  ) AS scopes
`;

export const create = async (
  input: {
    name: string;
    keyPrefix: string;
    keyHash: string;
    createdBy: string | null;
    expiresAt: Date | null;
  },
  executor?: Executor,
): Promise<ApiKey> => {
  const sql = `
    INSERT INTO api_keys (name, key_prefix, key_hash, created_by, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, key_prefix, status, created_by,
              last_used_at, expires_at, revoked_at, created_at
  `;
  const result = await runQuery<ApiKeyRow>(executor, sql, [
    input.name,
    input.keyPrefix,
    input.keyHash,
    input.createdBy,
    input.expiresAt,
  ]);
  return toApiKey(result.rows[0]);
};

export const attachScopes = async (
  apiKeyId: string,
  permissionIds: string[],
  executor: Executor,
): Promise<void> => {
  if (permissionIds.length === 0) return;
  const sql = `
    INSERT INTO api_key_scopes (api_key_id, permission_id)
    SELECT $1, unnested.permission_id
      FROM unnest($2::uuid[]) AS unnested(permission_id)
    ON CONFLICT (api_key_id, permission_id) DO NOTHING
  `;
  await runQuery(executor, sql, [apiKeyId, permissionIds]);
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<ApiKeyWithScopes | null> => {
  const sql = `SELECT ${COLUMNS}, ${SCOPES_AGG} FROM api_keys ak WHERE ak.id = $1`;
  const result = await runQuery<ApiKeyRow & { scopes: string[] }>(executor, sql, [id]);
  const row = result.rows[0];
  return row ? { ...toApiKey(row), scopes: row.scopes } : null;
};

export const findAll = async (
  pagination: PaginationParams,
): Promise<PaginatedResult<ApiKeyWithScopes>> => {
  const sql = `
    SELECT ${COLUMNS}, ${SCOPES_AGG}, COUNT(*) OVER() AS total_count
      FROM api_keys ak
     ORDER BY ak.created_at DESC, ak.id DESC
     LIMIT $1 OFFSET $2
  `;
  const result = await runQuery<ApiKeyRow & { scopes: string[]; total_count: number }>(
    undefined,
    sql,
    [pagination.limit, pagination.offset],
  );
  return {
    rows: result.rows.map((row) => ({ ...toApiKey(row), scopes: row.scopes })),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/**
 * Authentication path. Only returns a usable key: ACTIVE, not revoked, not past
 * its expiry. Everything else is indistinguishable from "unknown key".
 */
export const resolveByHash = async (
  keyHash: string,
  executor?: Executor,
): Promise<ResolvedApiKey | null> => {
  const sql = `
    SELECT ak.id, ak.name, ak.key_prefix, ak.created_by, ${SCOPES_AGG}
      FROM api_keys ak
     WHERE ak.key_hash = $1
       AND ak.status = 'ACTIVE'
       AND ak.revoked_at IS NULL
       AND (ak.expires_at IS NULL OR ak.expires_at > now())
  `;
  const result = await runQuery<{
    id: string;
    name: string;
    key_prefix: string;
    created_by: string | null;
    scopes: string[];
  }>(executor, sql, [keyHash]);

  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    createdBy: row.created_by,
    scopes: new Set(row.scopes),
  };
};

export const touchLastUsed = async (id: string): Promise<void> => {
  await runQuery(undefined, 'UPDATE api_keys SET last_used_at = now() WHERE id = $1', [id]);
};

export const revoke = async (id: string, executor?: Executor): Promise<boolean> => {
  const sql = `
    UPDATE api_keys
       SET status = 'REVOKED', revoked_at = now()
     WHERE id = $1 AND revoked_at IS NULL
  `;
  const result = await runQuery(executor, sql, [id]);
  return (result.rowCount ?? 0) > 0;
};
