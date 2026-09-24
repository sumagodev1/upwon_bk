// src/modules/home-page/repositories/values-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateValuesEntryInput,
  UpdateValuesEntryInput,
  ValuesEntry,
  ValuesEntryFilters,
} from '../types/values-section.types';

/**
 * One table, one row per card - the same shape as the other home page
 * sections, so all four repositories read the same way.
 */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  cardTitle: 've.card_title',
  displayOrder: 've.display_order',
  status: 've.status',
  createdAt: 've.created_at',
  updatedAt: 've.updated_at',
} as const;

/**
 * Columns an update may touch. The two image columns are absent because they
 * need the "setting one clears the other" handling below, and updated_by is
 * absent because it comes from the request context, never from the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  cardTitle: 'card_title',
  cardBody: 'card_body',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  ve.id, ve.image_url, ve.image_file_id,
  ve.card_title, ve.card_body, ve.display_order, ve.status,
  ve.created_by, ve.updated_by, ve.created_at, ve.updated_at
`;

const RETURNING_COLUMNS = `
  id, image_url, image_file_id,
  card_title, card_body, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface EntryRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  card_title: string;
  card_body: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toEntry = (row: EntryRow): ValuesEntry => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  cardTitle: row.card_title,
  cardBody: row.card_body,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * created_at is the tiebreaker rather than id, so two cards sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
const PUBLISHED_ORDER = 'ORDER BY ve.display_order ASC, ve.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<ValuesEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_values_entries ve WHERE ve.id = $1`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ValuesEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_values_entries ve
      WHERE ve.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const findAll = async (
  filters: ValuesEntryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ValuesEntry>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 've.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(ve.card_title ILIKE ? OR ve.card_body ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the grid.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM home_values_entries ve
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, ve.created_at ASC
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

/** The public read path: every ACTIVE card, in order. */
export const findPublished = async (executor?: Executor): Promise<ValuesEntry[]> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_values_entries ve
      WHERE ve.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toEntry);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM home_values_entries',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM home_values_entries',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateValuesEntryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ValuesEntry> => {
  const sql = `
    INSERT INTO home_values_entries
      (image_url, image_file_id,
       card_title, card_body, display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<EntryRow>(executor, sql, [
    input.imageUrl,
    input.imageFileId,
    input.cardTitle,
    input.cardBody,
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toEntry(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateValuesEntryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ValuesEntry | null> => {
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
   * onto a card that already has an imageFileId violates the constraint
   * instead of replacing the image.
   */
  if (patch.imageUrl !== undefined) {
    assign('image_url', patch.imageUrl);
    if (patch.imageUrl !== null && patch.imageFileId === undefined) {
      assign('image_file_id', null);
    }
  }
  if (patch.imageFileId !== undefined) {
    assign('image_file_id', patch.imageFileId);
    if (patch.imageFileId !== null && patch.imageUrl === undefined) {
      assign('image_url', null);
    }
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const sql = `
    UPDATE home_values_entries SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<EntryRow>(executor, sql, values);
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ValuesEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE home_values_entries SET status = $2, updated_by = $3
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
    `UPDATE home_values_entries AS ve
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE ve.id = ordered.id`,
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
    'SELECT id FROM home_values_entries WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM home_values_entries WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
