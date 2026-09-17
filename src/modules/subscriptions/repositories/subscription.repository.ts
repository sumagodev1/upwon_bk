// src/modules/subscriptions/repositories/subscription.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { BillingInterval, SubscriptionStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateSubscriptionInput,
  Subscription,
  SubscriptionFilters,
  SubscriptionWithRefs,
  UpdateSubscriptionInput,
} from '../types/subscription.types';

const SUBSCRIPTION_SORT_COLUMNS: Readonly<Record<string, string>> = {
  createdAt: 's.created_at',
  updatedAt: 's.updated_at',
  startDate: 's.start_date',
  endDate: 's.end_date',
  status: 's.status',
} as const;

const UPDATABLE_COLUMNS: Record<string, string> = {
  planId: 'plan_id',
  status: 'status',
  startDate: 'start_date',
  endDate: 'end_date',
};

const BASE_COLUMNS = `
  s.id, s.organization_id, s.plan_id, s.status,
  s.start_date, s.end_date, s.cancelled_at, s.created_at, s.updated_at
`;

const RETURNING_COLUMNS = `
  id, organization_id, plan_id, status,
  start_date, end_date, cancelled_at, created_at, updated_at
`;

const JOINED_COLUMNS = `
  ${BASE_COLUMNS},
  o.name AS organization_name,
  o.slug::text AS organization_slug,
  p.name AS plan_name,
  p.code AS plan_code,
  p.price::text AS plan_price,
  p.currency AS plan_currency,
  p.billing_interval AS plan_billing_interval
`;

const JOINS = `
  JOIN organizations o ON o.id = s.organization_id
  JOIN plans p ON p.id = s.plan_id
`;

interface SubscriptionRow {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  start_date: Date;
  end_date: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface SubscriptionJoinedRow extends SubscriptionRow {
  organization_name: string;
  organization_slug: string;
  plan_name: string;
  plan_code: string;
  plan_price: string;
  plan_currency: string;
  plan_billing_interval: string;
}

const toSubscription = (row: SubscriptionRow): Subscription => ({
  id: row.id,
  organizationId: row.organization_id,
  planId: row.plan_id,
  status: row.status as SubscriptionStatus,
  startDate: row.start_date,
  endDate: row.end_date,
  cancelledAt: row.cancelled_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSubscriptionWithRefs = (row: SubscriptionJoinedRow): SubscriptionWithRefs => ({
  ...toSubscription(row),
  organizationName: row.organization_name,
  organizationSlug: row.organization_slug,
  planName: row.plan_name,
  planCode: row.plan_code,
  planPrice: row.plan_price,
  planCurrency: row.plan_currency,
  planBillingInterval: row.plan_billing_interval as BillingInterval,
});

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<Subscription | null> => {
  const sql = `SELECT ${BASE_COLUMNS} FROM subscriptions s WHERE s.id = $1`;
  const result = await runQuery<SubscriptionRow>(executor, sql, [id]);
  return result.rows[0] ? toSubscription(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<Subscription | null> => {
  const sql = `SELECT ${BASE_COLUMNS} FROM subscriptions s WHERE s.id = $1 FOR UPDATE`;
  const result = await runQuery<SubscriptionRow>(executor, sql, [id]);
  return result.rows[0] ? toSubscription(result.rows[0]) : null;
};

export const findDetailById = async (
  id: string,
  executor?: Executor,
): Promise<SubscriptionWithRefs | null> => {
  const sql = `
    SELECT ${JOINED_COLUMNS}
      FROM subscriptions s
      ${JOINS}
     WHERE s.id = $1
  `;
  const result = await runQuery<SubscriptionJoinedRow>(executor, sql, [id]);
  return result.rows[0] ? toSubscriptionWithRefs(result.rows[0]) : null;
};

export const findAll = async (
  filters: SubscriptionFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<SubscriptionWithRefs>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.organizationId, {
    column: 's.organization_id',
    operator: '=',
    value: filters.organizationId,
  });
  builder.whereIf(filters.planId, {
    column: 's.plan_id',
    operator: '=',
    value: filters.planId,
  });
  builder.whereIf(filters.status, {
    column: 's.status',
    operator: '=',
    value: filters.status,
  });
  builder.whereIf(filters.createdFrom, {
    column: 's.created_at',
    operator: '>=',
    value: filters.createdFrom,
  });
  builder.whereIf(filters.createdTo, {
    column: 's.created_at',
    operator: '<=',
    value: filters.createdTo,
  });

  if (filters.expiringWithinDays !== undefined) {
    builder.raw(
      `(s.status IN ('ACTIVE', 'TRIALING')
        AND s.end_date IS NOT NULL
        AND s.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (?::int * INTERVAL '1 day'))`,
      filters.expiringWithinDays,
    );
  }

  if (pagination.search) {
    builder.raw(
      '(o.name ILIKE ? OR o.slug ILIKE ? OR p.name ILIKE ?)',
      `%${pagination.search}%`,
      `%${pagination.search}%`,
      `%${pagination.search}%`,
    );
  }

  const sort = resolveSort(
    pagination.sortBy,
    pagination.sortOrder,
    SUBSCRIPTION_SORT_COLUMNS,
    { field: 'createdAt', order: 'desc' },
  );

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  const sql = `
    SELECT ${JOINED_COLUMNS},
           COUNT(*) OVER() AS total_count
      FROM subscriptions s
      ${JOINS}
    ${whereClause}
     ORDER BY ${sort.column} ${sort.order}, s.id DESC
    ${limitClause}
  `;

  const result = await runQuery<SubscriptionJoinedRow & { total_count: number }>(
    undefined,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toSubscriptionWithRefs),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const create = async (
  input: CreateSubscriptionInput,
  executor?: Executor,
): Promise<Subscription> => {
  const sql = `
    INSERT INTO subscriptions (organization_id, plan_id, status, start_date, end_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<SubscriptionRow>(executor, sql, [
    input.organizationId,
    input.planId,
    input.status,
    input.startDate,
    input.endDate,
  ]);
  return toSubscription(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateSubscriptionInput,
  executor?: Executor,
): Promise<Subscription | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findById(id, executor);

  values.push(id);
  const sql = `
    UPDATE subscriptions SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<SubscriptionRow>(executor, sql, values);
  return result.rows[0] ? toSubscription(result.rows[0]) : null;
};

export const cancel = async (
  id: string,
  endDate: Date | null,
  executor?: Executor,
): Promise<Subscription | null> => {
  const sql = `
    UPDATE subscriptions
       SET status = 'CANCELLED', cancelled_at = now(), end_date = $2
     WHERE id = $1
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<SubscriptionRow>(executor, sql, [id, endDate]);
  return result.rows[0] ? toSubscription(result.rows[0]) : null;
};

export const updateStatusByOrganization = async (
  organizationId: string,
  fromStatuses: SubscriptionStatus[],
  toStatus: SubscriptionStatus,
  executor?: Executor,
): Promise<number> => {
  const sql = `
    UPDATE subscriptions
       SET status = $3
     WHERE organization_id = $1
       AND status = ANY($2::text[])
  `;
  const result = await runQuery(executor, sql, [organizationId, fromStatuses, toStatus]);
  return result.rowCount ?? 0;
};

export const countLiveByOrganization = async (
  organizationId: string,
  executor?: Executor,
): Promise<number> => {
  const sql = `
    SELECT COUNT(*) AS count
      FROM subscriptions
     WHERE organization_id = $1 AND status IN ('ACTIVE', 'TRIALING')
  `;
  const result = await runQuery<{ count: number }>(executor, sql, [organizationId]);
  return Number(result.rows[0]?.count ?? 0);
};

export const countLiveByPlan = async (
  planId: string,
  executor?: Executor,
): Promise<number> => {
  const sql = `
    SELECT COUNT(*) AS count
      FROM subscriptions
     WHERE plan_id = $1 AND status IN ('ACTIVE', 'TRIALING')
  `;
  const result = await runQuery<{ count: number }>(executor, sql, [planId]);
  return Number(result.rows[0]?.count ?? 0);
};

/**
 * Idempotent expiry sweep. A subscription whose end_date has passed must become
 * EXPIRED even if nobody looks at it, so this runs on a schedule rather than
 * lazily on read.
 */
export const expirePastDue = async (
  executor?: Executor,
): Promise<Array<{ id: string; organizationId: string }>> => {
  const sql = `
    UPDATE subscriptions
       SET status = 'EXPIRED'
     WHERE status IN ('ACTIVE', 'TRIALING')
       AND end_date IS NOT NULL
       AND end_date < CURRENT_DATE
    RETURNING id, organization_id
  `;
  const result = await runQuery<{ id: string; organization_id: string }>(executor, sql, []);
  return result.rows.map((row) => ({ id: row.id, organizationId: row.organization_id }));
};
