// src/modules/admins/repositories/admin.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { AdminStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  Admin,
  AdminFilters,
  AdminRoleRef,
  AdminWithPassword,
  AdminWithRoles,
  CreateAdminInput,
  UpdateAdminInput,
} from '../types/admin.types';

const ADMIN_SORT_COLUMNS: Readonly<Record<string, string>> = {
  createdAt: 'a.created_at',
  updatedAt: 'a.updated_at',
  firstName: 'a.first_name',
  lastName: 'a.last_name',
  email: 'a.email',
  status: 'a.status',
  lastLoginAt: 'a.last_login_at',
} as const;

/**
 * Whitelist for the dynamic SET clause. A key not present here is silently
 * ignored, so no client-supplied key can ever become a column name.
 */
const UPDATABLE_COLUMNS: Record<keyof UpdateAdminInput, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
};

const QUALIFIED_COLUMNS = `
  a.id, a.first_name, a.last_name, a.email::text AS email, a.status,
  a.last_login_at, a.created_at, a.updated_at, a.deleted_at
`;

const RETURNING_COLUMNS = `
  id, first_name, last_name, email::text AS email, status,
  last_login_at, created_at, updated_at, deleted_at
`;

interface AdminRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

const toAdmin = (row: AdminRow): Admin => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  status: row.status as AdminStatus,
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<Admin | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM admins a
     WHERE a.id = $1 AND a.deleted_at IS NULL
  `;
  const result = await runQuery<AdminRow>(executor, sql, [id]);
  return result.rows[0] ? toAdmin(result.rows[0]) : null;
};

/** Locks the row for the transaction - required before any read-then-write. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<Admin | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM admins a
     WHERE a.id = $1 AND a.deleted_at IS NULL
       FOR UPDATE
  `;
  const result = await runQuery<AdminRow>(executor, sql, [id]);
  return result.rows[0] ? toAdmin(result.rows[0]) : null;
};

export const findByEmail = async (
  email: string,
  executor?: Executor,
): Promise<Admin | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM admins a
     WHERE a.email = $1 AND a.deleted_at IS NULL
  `;
  const result = await runQuery<AdminRow>(executor, sql, [email]);
  return result.rows[0] ? toAdmin(result.rows[0]) : null;
};

/**
 * One of only two functions that return password_hash, used exclusively by the
 * auth service. Keeping them separate means no ordinary read path can leak
 * the hash.
 */
export const findByEmailWithPassword = async (
  email: string,
  executor?: Executor,
): Promise<AdminWithPassword | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, a.password_hash
      FROM admins a
     WHERE a.email = $1 AND a.deleted_at IS NULL
  `;
  const result = await runQuery<AdminRow & { password_hash: string }>(executor, sql, [
    email,
  ]);
  const row = result.rows[0];
  return row ? { ...toAdmin(row), passwordHash: row.password_hash } : null;
};

export const findByIdWithPassword = async (
  id: string,
  executor?: Executor,
): Promise<AdminWithPassword | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, a.password_hash
      FROM admins a
     WHERE a.id = $1 AND a.deleted_at IS NULL
  `;
  const result = await runQuery<AdminRow & { password_hash: string }>(executor, sql, [id]);
  const row = result.rows[0];
  return row ? { ...toAdmin(row), passwordHash: row.password_hash } : null;
};

export const findDetailById = async (
  id: string,
  executor?: Executor,
): Promise<AdminWithRoles | null> => {
  // Roles aggregated in the same query - no N+1, no second round trip.
  // FILTER (WHERE r.id IS NOT NULL) prevents [{null}] for a role-less admin.
  const sql = `
    SELECT ${QUALIFIED_COLUMNS},
           COALESCE(
             json_agg(
               json_build_object('id', r.id, 'name', r.name, 'description', r.description)
               ORDER BY r.name
             ) FILTER (WHERE r.id IS NOT NULL),
             '[]'
           ) AS roles
      FROM admins a
      LEFT JOIN admin_roles ar ON ar.admin_id = a.id
      LEFT JOIN roles r ON r.id = ar.role_id
     WHERE a.id = $1 AND a.deleted_at IS NULL
     GROUP BY a.id
  `;
  const result = await runQuery<AdminRow & { roles: AdminRoleRef[] }>(executor, sql, [id]);
  const row = result.rows[0];
  return row ? { ...toAdmin(row), roles: row.roles } : null;
};

export const findAll = async (
  filters: AdminFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<AdminWithRoles>> => {
  const builder = new SqlBuilder();
  builder.raw('a.deleted_at IS NULL');
  builder.whereIf(filters.status, { column: 'a.status', operator: '=', value: filters.status });
  builder.whereIf(filters.createdFrom, {
    column: 'a.created_at',
    operator: '>=',
    value: filters.createdFrom,
  });
  builder.whereIf(filters.createdTo, {
    column: 'a.created_at',
    operator: '<=',
    value: filters.createdTo,
  });

  if (filters.roleId) {
    // EXISTS rather than a JOIN: filtering must not multiply rows before the
    // json_agg below re-aggregates them.
    builder.raw(
      'EXISTS (SELECT 1 FROM admin_roles ar2 WHERE ar2.admin_id = a.id AND ar2.role_id = ?)',
      filters.roleId,
    );
  }

  if (pagination.search) {
    // Full-text for word matches (uses the GIN index) plus a prefix ILIKE for
    // partial-token typing. The pattern is built in JS and passed as a
    // parameter; it never enters the SQL text.
    builder.raw(
      `(to_tsvector('simple', a.first_name || ' ' || a.last_name || ' ' || a.email)
          @@ plainto_tsquery('simple', ?)
        OR a.first_name ILIKE ? OR a.last_name ILIKE ? OR a.email ILIKE ?)`,
      pagination.search,
      `${pagination.search}%`,
      `${pagination.search}%`,
      `${pagination.search}%`,
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, ADMIN_SORT_COLUMNS, {
    field: 'createdAt',
    order: 'desc',
  });

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  const sql = `
    SELECT ${QUALIFIED_COLUMNS},
           COALESCE(
             json_agg(
               json_build_object('id', r.id, 'name', r.name, 'description', r.description)
               ORDER BY r.name
             ) FILTER (WHERE r.id IS NOT NULL),
             '[]'
           ) AS roles,
           COUNT(*) OVER() AS total_count
      FROM admins a
      LEFT JOIN admin_roles ar ON ar.admin_id = a.id
      LEFT JOIN roles r ON r.id = ar.role_id
    ${whereClause}
     GROUP BY a.id
     ORDER BY ${sort.column} ${sort.order}, a.id DESC
    ${limitClause}
  `;

  const result = await runQuery<AdminRow & { roles: AdminRoleRef[]; total_count: number }>(
    undefined,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map((row) => ({ ...toAdmin(row), roles: row.roles })),
    // COUNT(*) OVER() with GROUP BY counts groups, not raw rows - which is
    // exactly the admin count we want.
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const existsByEmail = async (
  email: string,
  excludeId?: string,
  executor?: Executor,
): Promise<boolean> => {
  const sql = `
    SELECT 1
      FROM admins
     WHERE email = $1
       AND deleted_at IS NULL
       AND ($2::uuid IS NULL OR id <> $2::uuid)
     LIMIT 1
  `;
  const result = await runQuery(executor, sql, [email, excludeId ?? null]);
  return (result.rowCount ?? 0) > 0;
};

export const create = async (
  input: CreateAdminInput,
  executor?: Executor,
): Promise<Admin> => {
  const sql = `
    INSERT INTO admins (first_name, last_name, email, password_hash, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<AdminRow>(executor, sql, [
    input.firstName,
    input.lastName,
    input.email,
    input.passwordHash,
    input.status,
  ]);
  return toAdmin(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateAdminInput,
  executor?: Executor,
): Promise<Admin | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = patch[key as keyof UpdateAdminInput];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findById(id, executor);

  values.push(id);
  const sql = `
    UPDATE admins
       SET ${assignments.join(', ')}
     WHERE id = $${values.length} AND deleted_at IS NULL
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<AdminRow>(executor, sql, values);
  return result.rows[0] ? toAdmin(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: AdminStatus,
  executor?: Executor,
): Promise<Admin | null> => {
  const sql = `
    UPDATE admins SET status = $2
     WHERE id = $1 AND deleted_at IS NULL
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<AdminRow>(executor, sql, [id, status]);
  return result.rows[0] ? toAdmin(result.rows[0]) : null;
};

export const updateLastLogin = async (
  id: string,
  executor?: Executor,
): Promise<void> => {
  await runQuery(executor, 'UPDATE admins SET last_login_at = now() WHERE id = $1', [id]);
};

export const updatePasswordHash = async (
  id: string,
  passwordHash: string,
  executor?: Executor,
): Promise<void> => {
  await runQuery(executor, 'UPDATE admins SET password_hash = $2 WHERE id = $1', [
    id,
    passwordHash,
  ]);
};

export const softDelete = async (
  id: string,
  executor?: Executor,
): Promise<boolean> => {
  const sql = `UPDATE admins SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`;
  const result = await runQuery(executor, sql, [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── role membership ────────────────────────────────────────────────────────
// Reads of an admin's roles/permissions live in the permission repository;
// this repository owns the mutations and the locking.

/** Bulk insert via UNNEST - one statement regardless of role count. */
export const assignRoles = async (
  adminId: string,
  roleIds: string[],
  assignedBy: string | null,
  executor: Executor,
): Promise<void> => {
  if (roleIds.length === 0) return;
  const sql = `
    INSERT INTO admin_roles (admin_id, role_id, assigned_by)
    SELECT $1, unnested.role_id, $3
      FROM unnest($2::uuid[]) AS unnested(role_id)
    ON CONFLICT (admin_id, role_id) DO NOTHING
  `;
  await runQuery(executor, sql, [adminId, roleIds, assignedBy]);
};

export const removeAllRoles = async (
  adminId: string,
  executor: Executor,
): Promise<void> => {
  await runQuery(executor, 'DELETE FROM admin_roles WHERE admin_id = $1', [adminId]);
};

/**
 * Counts ACTIVE admins holding a role, locking the membership rows for the
 * duration of the transaction.
 *
 * FOR UPDATE is on admin_roles (not admins) because that is the table the
 * caller is about to mutate. Two concurrent role-removals therefore serialize
 * instead of both observing a safe count.
 */
export const countActiveAdminsWithRoleForUpdate = async (
  roleName: string,
  executor: Executor,
): Promise<number> => {
  const sql = `
    SELECT ar.admin_id
      FROM admin_roles ar
      JOIN roles r ON r.id = ar.role_id
      JOIN admins a ON a.id = ar.admin_id
     WHERE r.name = $1
       AND a.status = 'ACTIVE'
       AND a.deleted_at IS NULL
       FOR UPDATE OF ar
  `;
  const result = await runQuery(executor, sql, [roleName]);
  return result.rowCount ?? 0;
};

export const findExistingRoleIds = async (
  roleIds: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (roleIds.length === 0) return [];
  const sql = `SELECT id FROM roles WHERE id = ANY($1::uuid[])`;
  const result = await runQuery<{ id: string }>(executor, sql, [roleIds]);
  return result.rows.map((row) => row.id);
};

export const findRoleNamesByIds = async (
  roleIds: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (roleIds.length === 0) return [];
  const sql = `SELECT name FROM roles WHERE id = ANY($1::uuid[]) ORDER BY name`;
  const result = await runQuery<{ name: string }>(executor, sql, [roleIds]);
  return result.rows.map((row) => row.name);
};
