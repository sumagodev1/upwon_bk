// src/modules/product-pages/hreasy-page/repositories/lifecycle-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateHreasyLifecycleCardInput,
  HreasyLifecycleCard,
  HreasyLifecycleCardFilters,
  UpdateHreasyLifecycleCardInput,
} from '../types/lifecycle-section.types';

/** One table, one row per card - a plain ordered list. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'lc.title',
  displayOrder: 'lc.display_order',
  status: 'lc.status',
  createdAt: 'lc.created_at',
  updatedAt: 'lc.updated_at',
} as const;

/**
 * Columns an update may touch directly. The image pair is absent because it
 * needs the "setting one clears the other" handling, and updated_by is absent
 * because it comes from the request context rather than the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  title: 'title',
  description: 'description',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  lc.id, lc.title, lc.description,
  lc.image_url, lc.image_file_id,
  lc.display_order, lc.status,
  lc.created_by, lc.updated_by, lc.created_at, lc.updated_at
`;

const RETURNING_COLUMNS = `
  id, title, description,
  image_url, image_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CardRow {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  image_file_id: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCard = (row: CardRow): HreasyLifecycleCard => ({
  id: row.id,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
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
const PUBLISHED_ORDER = 'ORDER BY lc.display_order ASC, lc.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<HreasyLifecycleCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM hreasy_lifecycle_cards lc WHERE lc.id = $1`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<HreasyLifecycleCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM hreasy_lifecycle_cards lc
      WHERE lc.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findAll = async (
  filters: HreasyLifecycleCardFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<HreasyLifecycleCard>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'lc.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      `(lc.title ILIKE ? OR lc.description ILIKE ?)`,
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
      FROM hreasy_lifecycle_cards lc
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, lc.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<CardRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toCard),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE card, in order. */
export const findPublished = async (executor?: Executor): Promise<HreasyLifecycleCard[]> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM hreasy_lifecycle_cards lc
      WHERE lc.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toCard);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM hreasy_lifecycle_cards',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM hreasy_lifecycle_cards',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateHreasyLifecycleCardInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<HreasyLifecycleCard> => {
  const sql = `
    INSERT INTO hreasy_lifecycle_cards
      (title, description, image_url, image_file_id,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<CardRow>(executor, sql, [
    input.title,
    input.description,
    input.imageUrl,
    input.imageFileId,
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toCard(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateHreasyLifecycleCardInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyLifecycleCard | null> => {
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
   * Exactly one image source may be set, so naming one has to clear the other
   * in the same statement. Without this, patching imageUrl onto a card that
   * already has an imageFileId violates the constraint instead of replacing
   * the photograph.
   */
  if (patch.imageUrl !== undefined) {
    assign('image_url', patch.imageUrl);
    if (patch.imageFileId === undefined) assign('image_file_id', null);
  }
  if (patch.imageFileId !== undefined) {
    assign('image_file_id', patch.imageFileId);
    if (patch.imageUrl === undefined) assign('image_url', null);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const sql = `
    UPDATE hreasy_lifecycle_cards SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<CardRow>(executor, sql, values);
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyLifecycleCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `UPDATE hreasy_lifecycle_cards SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${RETURNING_COLUMNS}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
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
    `UPDATE hreasy_lifecycle_cards AS lc
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE lc.id = ordered.id`,
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
    'SELECT id FROM hreasy_lifecycle_cards WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM hreasy_lifecycle_cards WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
