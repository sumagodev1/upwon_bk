// src/modules/audit-logs/repositories/audit-log.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  AuditInsertPayload,
  AuditLogEntry,
  AuditLogFilters,
} from '../types/audit-log.types';

const AUDIT_SORT_COLUMNS: Readonly<Record<string, string>> = {
  createdAt: 'al.created_at',
  action: 'al.action',
  module: 'al.module',
} as const;

interface AuditLogRow {
  id: number;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: Date;
  admin_id: string | null;
  admin_first_name: string | null;
  admin_last_name: string | null;
  admin_email: string | null;
}

const toAuditLogEntry = (row: AuditLogRow): AuditLogEntry => ({
  id: row.id,
  action: row.action,
  module: row.module,
  entityType: row.entity_type,
  entityId: row.entity_id,
  oldValues: row.old_values,
  newValues: row.new_values,
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  requestId: row.request_id,
  createdAt: row.created_at,
  actor: {
    id: row.admin_id,
    firstName: row.admin_first_name,
    lastName: row.admin_last_name,
    email: row.admin_email,
  },
});

const SELECT_COLUMNS = `
  al.id, al.action, al.module, al.entity_type, al.entity_id,
  al.old_values, al.new_values, al.ip_address::text AS ip_address,
  al.user_agent, al.request_id::text AS request_id, al.created_at,
  al.admin_id,
  a.first_name AS admin_first_name,
  a.last_name  AS admin_last_name,
  a.email::text AS admin_email
`;

export const insert = async (
  payload: AuditInsertPayload,
  executor?: Executor,
): Promise<void> => {
  const sql = `
    INSERT INTO audit_logs
      (admin_id, action, module, entity_type, entity_id,
       old_values, new_values, ip_address, user_agent, request_id)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::inet, $9, $10::uuid)
  `;
  await runQuery(executor, sql, [
    payload.adminId,
    payload.action,
    payload.module,
    payload.entityType,
    payload.entityId,
    payload.oldValues ? JSON.stringify(payload.oldValues) : null,
    payload.newValues ? JSON.stringify(payload.newValues) : null,
    payload.ipAddress,
    payload.userAgent,
    payload.requestId,
  ]);
};

export const findById = async (
  id: number,
  executor?: Executor,
): Promise<AuditLogEntry | null> => {
  const sql = `
    SELECT ${SELECT_COLUMNS}
      FROM audit_logs al
      LEFT JOIN admins a ON a.id = al.admin_id
     WHERE al.id = $1
  `;
  const result = await runQuery<AuditLogRow>(executor, sql, [id]);
  return result.rows[0] ? toAuditLogEntry(result.rows[0]) : null;
};

export const findAll = async (
  filters: AuditLogFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<AuditLogEntry>> => {
  const builder = new SqlBuilder();
  builder
    .whereIf(filters.adminId, { column: 'al.admin_id', operator: '=', value: filters.adminId })
    .whereIf(filters.action, { column: 'al.action', operator: '=', value: filters.action })
    .whereIf(filters.module, { column: 'al.module', operator: '=', value: filters.module })
    .whereIf(filters.entityType, {
      column: 'al.entity_type',
      operator: '=',
      value: filters.entityType,
    })
    .whereIf(filters.entityId, {
      column: 'al.entity_id',
      operator: '=',
      value: filters.entityId,
    })
    .whereIf(filters.dateFrom, {
      column: 'al.created_at',
      operator: '>=',
      value: filters.dateFrom,
    })
    .whereIf(filters.dateTo, { column: 'al.created_at', operator: '<=', value: filters.dateTo });

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, AUDIT_SORT_COLUMNS, {
    field: 'createdAt',
    order: 'desc',
  });

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  // ORDER BY ... , al.id DESC makes the sort deterministic. Without the
  // secondary key on the primary key, rows sharing a timestamp can appear on
  // two consecutive pages or on neither.
  const sql = `
    SELECT ${SELECT_COLUMNS},
           COUNT(*) OVER() AS total_count
      FROM audit_logs al
      LEFT JOIN admins a ON a.id = al.admin_id
    ${whereClause}
     ORDER BY ${sort.column} ${sort.order}, al.id DESC
    ${limitClause}
  `;

  const result = await runQuery<AuditLogRow & { total_count: number }>(
    undefined,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toAuditLogEntry),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** Distinct values for the filter dropdowns in the audit-log UI. */
export const findDistinctActions = async (executor?: Executor): Promise<string[]> => {
  const sql = `SELECT DISTINCT action FROM audit_logs ORDER BY action`;
  const result = await runQuery<{ action: string }>(executor, sql, []);
  return result.rows.map((row) => row.action);
};
