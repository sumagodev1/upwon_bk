// src/modules/permissions/repositories/permission.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { Permission } from '../types/permission.types';

interface PermissionRow {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
  created_at: Date;
}

const toPermission = (row: PermissionRow): Permission => ({
  id: row.id,
  key: row.key,
  module: row.module,
  action: row.action,
  description: row.description,
  createdAt: row.created_at,
});

export const findAll = async (executor?: Executor): Promise<Permission[]> => {
  const sql = `
    SELECT id, key, module, action, description, created_at
      FROM permissions
     ORDER BY module ASC, action ASC
  `;
  const result = await runQuery<PermissionRow>(executor, sql, []);
  return result.rows.map(toPermission);
};

export const findByKeys = async (
  keys: string[],
  executor?: Executor,
): Promise<Permission[]> => {
  if (keys.length === 0) return [];
  const sql = `
    SELECT id, key, module, action, description, created_at
      FROM permissions
     WHERE key = ANY($1::text[])
     ORDER BY module ASC, action ASC
  `;
  const result = await runQuery<PermissionRow>(executor, sql, [keys]);
  return result.rows.map(toPermission);
};

export const findExistingIds = async (
  permissionIds: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (permissionIds.length === 0) return [];
  const sql = `SELECT id FROM permissions WHERE id = ANY($1::uuid[])`;
  const result = await runQuery<{ id: string }>(executor, sql, [permissionIds]);
  return result.rows.map((row) => row.id);
};

export const findKeysByIds = async (
  permissionIds: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (permissionIds.length === 0) return [];
  const sql = `SELECT key FROM permissions WHERE id = ANY($1::uuid[]) ORDER BY key`;
  const result = await runQuery<{ key: string }>(executor, sql, [permissionIds]);
  return result.rows.map((row) => row.key);
};

// ── access resolution ──────────────────────────────────────────────────────
// These live here rather than in the admin repository so the authentication
// middleware depends on the permissions module alone, and so there is exactly
// one definition of "what can this admin do".

export const findRoleNamesForAdmin = async (
  adminId: string,
  executor?: Executor,
): Promise<string[]> => {
  const sql = `
    SELECT r.name
      FROM admin_roles ar
      JOIN roles r ON r.id = ar.role_id
     WHERE ar.admin_id = $1
     ORDER BY r.name
  `;
  const result = await runQuery<{ name: string }>(executor, sql, [adminId]);
  return result.rows.map((row) => row.name);
};

export const findPermissionKeysForAdmin = async (
  adminId: string,
  executor?: Executor,
): Promise<string[]> => {
  const sql = `
    SELECT DISTINCT p.key
      FROM admin_roles ar
      JOIN role_permissions rp ON rp.role_id = ar.role_id
      JOIN permissions p ON p.id = rp.permission_id
     WHERE ar.admin_id = $1
     ORDER BY p.key
  `;
  const result = await runQuery<{ key: string }>(executor, sql, [adminId]);
  return result.rows.map((row) => row.key);
};

export const findPermissionsForRole = async (
  roleId: string,
  executor?: Executor,
): Promise<Permission[]> => {
  const sql = `
    SELECT p.id, p.key, p.module, p.action, p.description, p.created_at
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1
     ORDER BY p.module ASC, p.action ASC
  `;
  const result = await runQuery<PermissionRow>(executor, sql, [roleId]);
  return result.rows.map(toPermission);
};

/** Scopes attached to an API key, returned as permission keys. */
export const findScopeKeysForApiKey = async (
  apiKeyId: string,
  executor?: Executor,
): Promise<string[]> => {
  const sql = `
    SELECT p.key
      FROM api_key_scopes aks
      JOIN permissions p ON p.id = aks.permission_id
     WHERE aks.api_key_id = $1
     ORDER BY p.key
  `;
  const result = await runQuery<{ key: string }>(executor, sql, [apiKeyId]);
  return result.rows.map((row) => row.key);
};
