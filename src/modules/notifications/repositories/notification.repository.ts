// src/modules/notifications/repositories/notification.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { NotificationType } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateNotificationInput,
  Notification,
  NotificationFilters,
} from '../types/notification.types';

const NOTIFICATION_SORT_COLUMNS: Readonly<Record<string, string>> = {
  createdAt: 'n.created_at',
  type: 'n.type',
  title: 'n.title',
} as const;

interface NotificationRow {
  id: string;
  admin_id: string | null;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

const toNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  adminId: row.admin_id,
  type: row.type as NotificationType,
  title: row.title,
  body: row.body,
  metadata: row.metadata ?? {},
  readAt: row.read_at,
  createdAt: row.created_at,
});

const COLUMNS = `n.id, n.admin_id, n.type, n.title, n.body, n.metadata, n.read_at, n.created_at`;

export const create = async (
  input: CreateNotificationInput,
  executor?: Executor,
): Promise<Notification> => {
  const sql = `
    INSERT INTO notifications (admin_id, type, title, body, metadata)
    VALUES ($1, $2, $3, $4, $5::jsonb)
    RETURNING id, admin_id, type, title, body, metadata, read_at, created_at
  `;
  const result = await runQuery<NotificationRow>(executor, sql, [
    input.adminId,
    input.type,
    input.title,
    input.body ?? null,
    JSON.stringify(input.metadata ?? {}),
  ]);
  return toNotification(result.rows[0]);
};

/**
 * Broadcast: one row per ACTIVE admin, inserted in a single statement.
 * A per-admin row (rather than one row with a null admin_id) is what lets each
 * recipient mark it read independently.
 */
export const broadcast = async (
  input: Omit<CreateNotificationInput, 'adminId'>,
  executor?: Executor,
): Promise<number> => {
  const sql = `
    INSERT INTO notifications (admin_id, type, title, body, metadata)
    SELECT a.id, $1, $2, $3, $4::jsonb
      FROM admins a
     WHERE a.status = 'ACTIVE' AND a.deleted_at IS NULL
  `;
  const result = await runQuery(executor, sql, [
    input.type,
    input.title,
    input.body ?? null,
    JSON.stringify(input.metadata ?? {}),
  ]);
  return result.rowCount ?? 0;
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<Notification | null> => {
  const sql = `SELECT ${COLUMNS} FROM notifications n WHERE n.id = $1`;
  const result = await runQuery<NotificationRow>(executor, sql, [id]);
  return result.rows[0] ? toNotification(result.rows[0]) : null;
};

export const findAllForAdmin = async (
  adminId: string,
  filters: NotificationFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<Notification>> => {
  const builder = new SqlBuilder();
  // Rows addressed to this admin, plus any global broadcast rows.
  builder.raw('(n.admin_id = ? OR n.admin_id IS NULL)', adminId);
  builder.whereIf(filters.type, { column: 'n.type', operator: '=', value: filters.type });
  if (filters.unreadOnly) {
    builder.where({ column: 'n.read_at', operator: 'IS NULL' });
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, NOTIFICATION_SORT_COLUMNS, {
    field: 'createdAt',
    order: 'desc',
  });

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM notifications n
    ${whereClause}
     ORDER BY ${sort.column} ${sort.order}, n.id DESC
    ${limitClause}
  `;

  const result = await runQuery<NotificationRow & { total_count: number }>(
    undefined,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toNotification),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const countUnread = async (
  adminId: string,
  executor?: Executor,
): Promise<number> => {
  const sql = `
    SELECT COUNT(*) AS count
      FROM notifications
     WHERE (admin_id = $1 OR admin_id IS NULL) AND read_at IS NULL
  `;
  const result = await runQuery<{ count: number }>(executor, sql, [adminId]);
  return Number(result.rows[0]?.count ?? 0);
};

export const markRead = async (
  id: string,
  adminId: string,
  executor?: Executor,
): Promise<boolean> => {
  const sql = `
    UPDATE notifications
       SET read_at = now()
     WHERE id = $1 AND admin_id = $2 AND read_at IS NULL
  `;
  const result = await runQuery(executor, sql, [id, adminId]);
  return (result.rowCount ?? 0) > 0;
};

export const markAllRead = async (
  adminId: string,
  executor?: Executor,
): Promise<number> => {
  const sql = `
    UPDATE notifications
       SET read_at = now()
     WHERE admin_id = $1 AND read_at IS NULL
  `;
  const result = await runQuery(executor, sql, [adminId]);
  return result.rowCount ?? 0;
};
