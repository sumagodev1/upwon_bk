// src/modules/organizations/repositories/organization.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { OrganizationStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateOrganizationInput,
  Organization,
  OrganizationDetail,
  OrganizationFilters,
  OrganizationListItem,
  UpdateOrganizationInput,
} from '../types/organization.types';

const ORGANIZATION_SORT_COLUMNS: Readonly<Record<string, string>> = {
  createdAt: 'o.created_at',
  updatedAt: 'o.updated_at',
  name: 'o.name',
  slug: 'o.slug',
  email: 'o.email',
  status: 'o.status',
} as const;

const UPDATABLE_COLUMNS: Record<keyof UpdateOrganizationInput, string> = {
  name: 'name',
  slug: 'slug',
  email: 'email',
  phone: 'phone',
};

const QUALIFIED_COLUMNS = `
  o.id, o.name, o.slug::text AS slug, o.email::text AS email, o.phone, o.status,
  o.created_at, o.updated_at, o.deleted_at
`;

const RETURNING_COLUMNS = `
  id, name, slug::text AS slug, email::text AS email, phone, status,
  created_at, updated_at, deleted_at
`;

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface OrganizationListRow extends OrganizationRow {
  plan_name: string | null;
  plan_code: string | null;
  subscription_status: string | null;
  subscription_end_date: Date | null;
}

const toOrganization = (row: OrganizationRow): Organization => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  email: row.email,
  phone: row.phone,
  status: row.status as OrganizationStatus,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const toListItem = (row: OrganizationListRow): OrganizationListItem => ({
  ...toOrganization(row),
  planName: row.plan_name,
  planCode: row.plan_code,
  subscriptionStatus: row.subscription_status,
  subscriptionEndDate: row.subscription_end_date,
});

/**
 * LATERAL keeps this to one live subscription per organization row without a
 * GROUP BY over the whole result set - this is what avoids the N+1.
 */
const CURRENT_SUBSCRIPTION_LATERAL = `
  LEFT JOIN LATERAL (
    SELECT p.name AS plan_name, p.code AS plan_code, s.status, s.end_date
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
     WHERE s.organization_id = o.id
       AND s.status IN ('ACTIVE', 'TRIALING')
     ORDER BY s.created_at DESC
     LIMIT 1
  ) sub ON true
`;

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<Organization | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM organizations o
     WHERE o.id = $1 AND o.deleted_at IS NULL
  `;
  const result = await runQuery<OrganizationRow>(executor, sql, [id]);
  return result.rows[0] ? toOrganization(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<Organization | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM organizations o
     WHERE o.id = $1 AND o.deleted_at IS NULL
       FOR UPDATE
  `;
  const result = await runQuery<OrganizationRow>(executor, sql, [id]);
  return result.rows[0] ? toOrganization(result.rows[0]) : null;
};

export const findDetailById = async (
  id: string,
  executor?: Executor,
): Promise<OrganizationDetail | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS},
           sub.plan_name, sub.plan_code,
           sub.status AS subscription_status,
           sub.end_date AS subscription_end_date,
           (SELECT COUNT(*) FROM subscriptions s2 WHERE s2.organization_id = o.id)
             AS subscription_count
      FROM organizations o
      ${CURRENT_SUBSCRIPTION_LATERAL}
     WHERE o.id = $1 AND o.deleted_at IS NULL
  `;
  const result = await runQuery<OrganizationListRow & { subscription_count: number }>(
    executor,
    sql,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { ...toListItem(row), subscriptionCount: Number(row.subscription_count) };
};

export const findAll = async (
  filters: OrganizationFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<OrganizationListItem>> => {
  const builder = new SqlBuilder();
  builder.raw('o.deleted_at IS NULL');
  builder.whereIf(filters.status, { column: 'o.status', operator: '=', value: filters.status });
  builder.whereIf(filters.createdFrom, {
    column: 'o.created_at',
    operator: '>=',
    value: filters.createdFrom,
  });
  builder.whereIf(filters.createdTo, {
    column: 'o.created_at',
    operator: '<=',
    value: filters.createdTo,
  });

  if (filters.planId) {
    builder.raw(
      `EXISTS (
         SELECT 1 FROM subscriptions s3
          WHERE s3.organization_id = o.id
            AND s3.plan_id = ?
            AND s3.status IN ('ACTIVE', 'TRIALING')
       )`,
      filters.planId,
    );
  }

  if (pagination.search) {
    builder.raw(
      `(to_tsvector('simple', o.name || ' ' || o.slug || ' ' || o.email)
          @@ plainto_tsquery('simple', ?)
        OR o.name ILIKE ? OR o.slug ILIKE ? OR o.email ILIKE ?)`,
      pagination.search,
      `${pagination.search}%`,
      `${pagination.search}%`,
      `${pagination.search}%`,
    );
  }

  const sort = resolveSort(
    pagination.sortBy,
    pagination.sortOrder,
    ORGANIZATION_SORT_COLUMNS,
    { field: 'createdAt', order: 'desc' },
  );

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  const sql = `
    SELECT ${QUALIFIED_COLUMNS},
           sub.plan_name, sub.plan_code,
           sub.status AS subscription_status,
           sub.end_date AS subscription_end_date,
           COUNT(*) OVER() AS total_count
      FROM organizations o
      ${CURRENT_SUBSCRIPTION_LATERAL}
    ${whereClause}
     ORDER BY ${sort.column} ${sort.order}, o.id DESC
    ${limitClause}
  `;

  const result = await runQuery<OrganizationListRow & { total_count: number }>(
    undefined,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toListItem),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const existsBySlug = async (
  slug: string,
  excludeId?: string,
  executor?: Executor,
): Promise<boolean> => {
  const sql = `
    SELECT 1
      FROM organizations
     WHERE slug = $1
       AND deleted_at IS NULL
       AND ($2::uuid IS NULL OR id <> $2::uuid)
     LIMIT 1
  `;
  const result = await runQuery(executor, sql, [slug, excludeId ?? null]);
  return (result.rowCount ?? 0) > 0;
};

export const create = async (
  input: CreateOrganizationInput,
  executor?: Executor,
): Promise<Organization> => {
  const sql = `
    INSERT INTO organizations (name, slug, email, phone, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<OrganizationRow>(executor, sql, [
    input.name,
    input.slug,
    input.email,
    input.phone ?? null,
    input.status,
  ]);
  return toOrganization(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateOrganizationInput,
  executor?: Executor,
): Promise<Organization | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = patch[key as keyof UpdateOrganizationInput];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findById(id, executor);

  values.push(id);
  const sql = `
    UPDATE organizations SET ${assignments.join(', ')}
     WHERE id = $${values.length} AND deleted_at IS NULL
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<OrganizationRow>(executor, sql, values);
  return result.rows[0] ? toOrganization(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: OrganizationStatus,
  executor?: Executor,
): Promise<Organization | null> => {
  const sql = `
    UPDATE organizations SET status = $2
     WHERE id = $1 AND deleted_at IS NULL
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<OrganizationRow>(executor, sql, [id, status]);
  return result.rows[0] ? toOrganization(result.rows[0]) : null;
};

export const softDelete = async (
  id: string,
  executor?: Executor,
): Promise<boolean> => {
  const sql = `
    UPDATE organizations SET deleted_at = now()
     WHERE id = $1 AND deleted_at IS NULL
  `;
  const result = await runQuery(executor, sql, [id]);
  return (result.rowCount ?? 0) > 0;
};
