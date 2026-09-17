// src/modules/plans/repositories/plan.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { BillingInterval, PlanStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreatePlanInput,
  Plan,
  PlanFilters,
  PlanWithUsage,
  UpdatePlanInput,
} from '../types/plan.types';

const PLAN_SORT_COLUMNS: Readonly<Record<string, string>> = {
  name: 'p.name',
  code: 'p.code',
  price: 'p.price',
  status: 'p.status',
  createdAt: 'p.created_at',
  updatedAt: 'p.updated_at',
} as const;

const UPDATABLE_COLUMNS: Record<string, string> = {
  name: 'name',
  description: 'description',
  price: 'price',
  currency: 'currency',
  billingInterval: 'billing_interval',
  status: 'status',
};

// price is cast to text so pg returns the exact decimal, never a float.
const QUALIFIED_COLUMNS = `
  p.id, p.name, p.code, p.description, p.price::text AS price, p.currency,
  p.billing_interval, p.features, p.status, p.created_at, p.updated_at
`;

const RETURNING_COLUMNS = `
  id, name, code, description, price::text AS price, currency,
  billing_interval, features, status, created_at, updated_at
`;

const ACTIVE_SUBSCRIPTION_COUNT = `
  (SELECT COUNT(*) FROM subscriptions s
    WHERE s.plan_id = p.id AND s.status IN ('ACTIVE', 'TRIALING'))
    AS active_subscriptions
`;

interface PlanRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price: string;
  currency: string;
  billing_interval: string;
  features: Record<string, unknown>;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const toPlan = (row: PlanRow): Plan => ({
  id: row.id,
  name: row.name,
  code: row.code,
  description: row.description,
  price: row.price,
  currency: row.currency,
  billingInterval: row.billing_interval as BillingInterval,
  features: row.features ?? {},
  status: row.status as PlanStatus,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<Plan | null> => {
  const sql = `SELECT ${QUALIFIED_COLUMNS} FROM plans p WHERE p.id = $1`;
  const result = await runQuery<PlanRow>(executor, sql, [id]);
  return result.rows[0] ? toPlan(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<Plan | null> => {
  const sql = `SELECT ${QUALIFIED_COLUMNS} FROM plans p WHERE p.id = $1 FOR UPDATE`;
  const result = await runQuery<PlanRow>(executor, sql, [id]);
  return result.rows[0] ? toPlan(result.rows[0]) : null;
};

export const findByCode = async (
  code: string,
  executor?: Executor,
): Promise<Plan | null> => {
  const sql = `SELECT ${QUALIFIED_COLUMNS} FROM plans p WHERE p.code = $1`;
  const result = await runQuery<PlanRow>(executor, sql, [code]);
  return result.rows[0] ? toPlan(result.rows[0]) : null;
};

export const findDetailById = async (
  id: string,
  executor?: Executor,
): Promise<PlanWithUsage | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, ${ACTIVE_SUBSCRIPTION_COUNT}
      FROM plans p
     WHERE p.id = $1
  `;
  const result = await runQuery<PlanRow & { active_subscriptions: number }>(executor, sql, [
    id,
  ]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...toPlan(row), activeSubscriptions: Number(row.active_subscriptions) };
};

export const findAll = async (
  filters: PlanFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<PlanWithUsage>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 'p.status', operator: '=', value: filters.status });
  builder.whereIf(filters.billingInterval, {
    column: 'p.billing_interval',
    operator: '=',
    value: filters.billingInterval,
  });
  if (pagination.search) {
    builder.raw(
      '(p.name ILIKE ? OR p.code ILIKE ?)',
      `%${pagination.search}%`,
      `%${pagination.search}%`,
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, PLAN_SORT_COLUMNS, {
    field: 'createdAt',
    order: 'desc',
  });

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  const sql = `
    SELECT ${QUALIFIED_COLUMNS},
           ${ACTIVE_SUBSCRIPTION_COUNT},
           COUNT(*) OVER() AS total_count
      FROM plans p
    ${whereClause}
     ORDER BY ${sort.column} ${sort.order}, p.id DESC
    ${limitClause}
  `;

  const result = await runQuery<
    PlanRow & { active_subscriptions: number; total_count: number }
  >(undefined, sql, builder.getValues());

  return {
    rows: result.rows.map((row) => ({
      ...toPlan(row),
      activeSubscriptions: Number(row.active_subscriptions),
    })),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const create = async (
  input: CreatePlanInput,
  executor?: Executor,
): Promise<Plan> => {
  const sql = `
    INSERT INTO plans
      (name, code, description, price, currency, billing_interval, features, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<PlanRow>(executor, sql, [
    input.name,
    input.code,
    input.description ?? null,
    input.price,
    input.currency,
    input.billingInterval,
    JSON.stringify(input.features ?? {}),
    input.status,
  ]);
  return toPlan(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdatePlanInput,
  executor?: Executor,
): Promise<Plan | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  // features needs an explicit jsonb cast, so it is handled separately.
  if (patch.features !== undefined) {
    values.push(JSON.stringify(patch.features));
    assignments.push(`features = $${values.length}::jsonb`);
  }

  if (assignments.length === 0) return findById(id, executor);

  values.push(id);
  const sql = `
    UPDATE plans SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<PlanRow>(executor, sql, values);
  return result.rows[0] ? toPlan(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: PlanStatus,
  executor?: Executor,
): Promise<Plan | null> => {
  const sql = `
    UPDATE plans SET status = $2 WHERE id = $1
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<PlanRow>(executor, sql, [id, status]);
  return result.rows[0] ? toPlan(result.rows[0]) : null;
};
