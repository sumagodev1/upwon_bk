// src/modules/product-pages/erp-page/repositories/trust-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateErpTrustEntryInput,
  ErpTrustEntry,
  ErpTrustEntryFilters,
  UpdateErpTrustEntryInput,
} from '../types/trust-section.types';

/** One table, one row per entry - the same shape as the home page's strip. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  imageAlt: 'te.image_alt',
  statValue: 'te.stat_value',
  displayOrder: 'te.display_order',
  status: 'te.status',
  createdAt: 'te.created_at',
  updatedAt: 'te.updated_at',
} as const;

/**
 * Columns an update may touch directly. The two image source columns are
 * absent because they need the "setting one clears the other" handling below,
 * and updated_by is absent because it comes from the request context.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  imageAlt: 'image_alt',
  statValue: 'stat_value',
  statLabel: 'stat_label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  te.id, te.image_url, te.image_file_id, te.image_alt,
  te.stat_value, te.stat_label, te.display_order, te.status,
  te.created_by, te.updated_by, te.created_at, te.updated_at
`;

const RETURNING_COLUMNS = `
  id, image_url, image_file_id, image_alt,
  stat_value, stat_label, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface EntryRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  image_alt: string | null;
  stat_value: string | null;
  stat_label: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toEntry = (row: EntryRow): ErpTrustEntry => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  imageAlt: row.image_alt,
  statValue: row.stat_value,
  statLabel: row.stat_label,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * created_at is the tiebreaker rather than id, so two entries sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
const PUBLISHED_ORDER = 'ORDER BY te.display_order ASC, te.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<ErpTrustEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM erp_trust_entries te WHERE te.id = $1`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpTrustEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM erp_trust_entries te WHERE te.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const findAll = async (
  filters: ErpTrustEntryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ErpTrustEntry>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'te.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      `(te.image_alt ILIKE ? OR te.stat_value ILIKE ? OR te.stat_label ILIKE ?)`,
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the strip.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM erp_trust_entries te
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, te.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<EntryRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toEntry),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE entry, in order. */
export const findPublished = async (executor?: Executor): Promise<ErpTrustEntry[]> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM erp_trust_entries te
      WHERE te.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toEntry);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_trust_entries',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/**
 * How many entries currently carry a counter.
 *
 * The marquee grows freely but the counter row is a fixed four-up grid, so the
 * two are capped separately - which is why this counts stats rather than rows.
 *
 * @param excludeId the entry being changed, so re-saving its own counter is
 *   not treated as adding a fifth
 */
export const countWithStat = async (
  excludeId: string | null,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    `SELECT COUNT(*) AS count FROM erp_trust_entries
      WHERE stat_value IS NOT NULL
        AND ($1::uuid IS NULL OR id <> $1)`,
    [excludeId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM erp_trust_entries',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateErpTrustEntryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpTrustEntry> => {
  const result = await runQuery<EntryRow>(
    executor,
    `INSERT INTO erp_trust_entries
       (image_url, image_file_id, image_alt, stat_value, stat_label,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING ${RETURNING_COLUMNS}`,
    [
      input.imageUrl,
      input.imageFileId,
      input.imageAlt,
      input.statValue,
      input.statLabel,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toEntry(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateErpTrustEntryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpTrustEntry | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  /*
   * The two image columns are mutually exclusive by CHECK, so setting one has
   * to clear the other in the same statement. Without this, patching imageUrl
   * onto an entry that already has an imageFileId violates the constraint
   * instead of replacing the logo.
   */
  if (patch.imageUrl !== undefined) {
    assign('image_url', patch.imageUrl);
    if (patch.imageUrl !== null && patch.imageFileId === undefined) assign('image_file_id', null);
  }
  if (patch.imageFileId !== undefined) {
    assign('image_file_id', patch.imageFileId);
    if (patch.imageFileId !== null && patch.imageUrl === undefined) assign('image_url', null);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE erp_trust_entries SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpTrustEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE erp_trust_entries SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${RETURNING_COLUMNS}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/**
 * Rewrites display_order for the given ids in one statement, each row's
 * position taken from its index in the array. One UPDATE rather than N keeps
 * the reorder atomic and holds the row locks for as short a time as possible.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE erp_trust_entries AS te
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE te.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

/** Returns the ids that actually exist, so a reorder can reject unknown ones. */
export const findExistingIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM erp_trust_entries WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_trust_entries WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
