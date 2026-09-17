// src/modules/roles/repositories/role.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import { Permission } from '../../permissions/types/permission.types';
import {
  CreateRoleInput,
  Role,
  RoleWithPermissions,
  UpdateRoleInput,
} from '../types/role.types';

const ROLE_SORT_COLUMNS: Readonly<Record<string, string>> = {
  name: 'r.name',
  createdAt: 'r.created_at',
  updatedAt: 'r.updated_at',
} as const;

const UPDATABLE_COLUMNS: Record<keyof UpdateRoleInput, string> = {
  name: 'name',
  description: 'description',
};

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: Date;
  updated_at: Date;
}

const toRole = (row: RoleRow): Role => ({
  id: row.id,
  name: row.name,
  description: row.description,
  isSystemRole: row.is_system_role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const DETAIL_AGGREGATES = `
  COALESCE(
    json_agg(
      json_build_object(
        'id', p.id, 'key', p.key, 'module', p.module,
        'action', p.action, 'description', p.description,
        'createdAt', p.created_at
      ) ORDER BY p.module, p.action
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'
  ) AS permissions,
  (SELECT COUNT(*) FROM admin_roles ar WHERE ar.role_id = r.id) AS admin_count
`;

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<Role | null> => {
  const sql = `
    SELECT id, name, description, is_system_role, created_at, updated_at
      FROM roles WHERE id = $1
  `;
  const result = await runQuery<RoleRow>(executor, sql, [id]);
  return result.rows[0] ? toRole(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<Role | null> => {
  const sql = `
    SELECT id, name, description, is_system_role, created_at, updated_at
      FROM roles WHERE id = $1 FOR UPDATE
  `;
  const result = await runQuery<RoleRow>(executor, sql, [id]);
  return result.rows[0] ? toRole(result.rows[0]) : null;
};

export const findByName = async (
  name: string,
  executor?: Executor,
): Promise<Role | null> => {
  const sql = `
    SELECT id, name, description, is_system_role, created_at, updated_at
      FROM roles WHERE name = $1
  `;
  const result = await runQuery<RoleRow>(executor, sql, [name]);
  return result.rows[0] ? toRole(result.rows[0]) : null;
};

export const findDetailById = async (
  id: string,
  executor?: Executor,
): Promise<RoleWithPermissions | null> => {
  const sql = `
    SELECT r.id, r.name, r.description, r.is_system_role, r.created_at, r.updated_at,
           ${DETAIL_AGGREGATES}
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE r.id = $1
     GROUP BY r.id
  `;
  const result = await runQuery<RoleRow & { permissions: Permission[]; admin_count: number }>(
    executor,
    sql,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...toRole(row),
    permissions: row.permissions,
    adminCount: Number(row.admin_count),
  };
};

export const findAll = async (
  pagination: PaginationParams,
  filters: { isSystemRole?: boolean } = {},
): Promise<PaginatedResult<RoleWithPermissions>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.isSystemRole, {
    column: 'r.is_system_role',
    operator: '=',
    value: filters.isSystemRole,
  });
  if (pagination.search) {
    builder.raw(
      '(r.name ILIKE ? OR r.description ILIKE ?)',
      `%${pagination.search}%`,
      `%${pagination.search}%`,
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, ROLE_SORT_COLUMNS, {
    field: 'name',
    order: 'asc',
  });

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  const sql = `
    SELECT r.id, r.name, r.description, r.is_system_role, r.created_at, r.updated_at,
           ${DETAIL_AGGREGATES},
           COUNT(*) OVER() AS total_count
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
    ${whereClause}
     GROUP BY r.id
     ORDER BY ${sort.column} ${sort.order}, r.id DESC
    ${limitClause}
  `;

  const result = await runQuery<
    RoleRow & { permissions: Permission[]; admin_count: number; total_count: number }
  >(undefined, sql, builder.getValues());

  return {
    rows: result.rows.map((row) => ({
      ...toRole(row),
      permissions: row.permissions,
      adminCount: Number(row.admin_count),
    })),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const create = async (
  input: CreateRoleInput,
  executor?: Executor,
): Promise<Role> => {
  const sql = `
    INSERT INTO roles (name, description, is_system_role)
    VALUES ($1, $2, $3)
    RETURNING id, name, description, is_system_role, created_at, updated_at
  `;
  const result = await runQuery<RoleRow>(executor, sql, [
    input.name,
    input.description ?? null,
    input.isSystemRole ?? false,
  ]);
  return toRole(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateRoleInput,
  executor?: Executor,
): Promise<Role | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = patch[key as keyof UpdateRoleInput];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findById(id, executor);

  values.push(id);
  const sql = `
    UPDATE roles SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING id, name, description, is_system_role, created_at, updated_at
  `;
  const result = await runQuery<RoleRow>(executor, sql, values);
  return result.rows[0] ? toRole(result.rows[0]) : null;
};

export const deleteById = async (
  id: string,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM roles WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

export const countAdminsWithRole = async (
  roleId: string,
  executor?: Executor,
): Promise<number> => {
  const sql = `SELECT COUNT(*) AS count FROM admin_roles WHERE role_id = $1`;
  const result = await runQuery<{ count: number }>(executor, sql, [roleId]);
  return Number(result.rows[0]?.count ?? 0);
};

// ── permission grants ──────────────────────────────────────────────────────

export const replacePermissions = async (
  roleId: string,
  permissionIds: string[],
  executor: Executor,
): Promise<void> => {
  await runQuery(executor, 'DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
  if (permissionIds.length === 0) return;

  const sql = `
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT $1, unnested.permission_id
      FROM unnest($2::uuid[]) AS unnested(permission_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING
  `;
  await runQuery(executor, sql, [roleId, permissionIds]);
};
