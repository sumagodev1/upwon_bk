// src/modules/product-pages/hreasy-page/repositories/capabilities-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateHreasyCapabilityModuleInput,
  HreasyCapabilityModule,
  HreasyCapabilityModuleFilters,
  UpdateHreasyCapabilityModuleInput,
} from '../types/capabilities-section.types';

/** One table, one row per lifecycle stage - a plain ordered list. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  name: 'cm.name',
  slug: 'cm.slug',
  displayOrder: 'cm.display_order',
  status: 'cm.status',
  createdAt: 'cm.created_at',
  updatedAt: 'cm.updated_at',
} as const;

/**
 * Columns an update may touch directly. The image pair is absent because it
 * needs the "setting one clears the other" handling, and updated_by is absent
 * because it comes from the request context rather than the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  name: 'name',
  slug: 'slug',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  cm.id, cm.name, cm.slug,
  cm.image_url, cm.image_file_id,
  cm.display_order, cm.status,
  cm.created_by, cm.updated_by, cm.created_at, cm.updated_at
`;

const RETURNING_COLUMNS = `
  id, name, slug,
  image_url, image_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface ModuleRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  image_file_id: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toModule = (row: ModuleRow): HreasyCapabilityModule => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
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
 * created_at is the tiebreaker rather than id, so two modules sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
const PUBLISHED_ORDER = 'ORDER BY cm.display_order ASC, cm.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<HreasyCapabilityModule | null> => {
  const result = await runQuery<ModuleRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM hreasy_capability_modules cm WHERE cm.id = $1`,
    [id],
  );
  return result.rows[0] ? toModule(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<HreasyCapabilityModule | null> => {
  const result = await runQuery<ModuleRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM hreasy_capability_modules cm
      WHERE cm.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toModule(result.rows[0]) : null;
};

/** Lets the service report a duplicate slug as a field error, not a 409. */
export const findBySlug = async (
  slug: string,
  executor?: Executor,
): Promise<HreasyCapabilityModule | null> => {
  const result = await runQuery<ModuleRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM hreasy_capability_modules cm WHERE cm.slug = $1`,
    [slug],
  );
  return result.rows[0] ? toModule(result.rows[0]) : null;
};

export const findAll = async (
  filters: HreasyCapabilityModuleFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<HreasyCapabilityModule>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'cm.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      `(cm.name ILIKE ? OR cm.slug ILIKE ?)`,
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the page.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM hreasy_capability_modules cm
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, cm.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<ModuleRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toModule),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE module, in order. */
export const findPublished = async (
  executor?: Executor,
): Promise<HreasyCapabilityModule[]> => {
  const result = await runQuery<ModuleRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM hreasy_capability_modules cm
      WHERE cm.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toModule);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM hreasy_capability_modules',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM hreasy_capability_modules',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateHreasyCapabilityModuleInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<HreasyCapabilityModule> => {
  const sql = `
    INSERT INTO hreasy_capability_modules
      (name, slug, image_url, image_file_id,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<ModuleRow>(executor, sql, [
    input.name,
    input.slug,
    input.imageUrl,
    input.imageFileId,
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toModule(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateHreasyCapabilityModuleInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyCapabilityModule | null> => {
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
   * in the same statement. Without this, patching imageUrl onto a module that
   * already has an imageFileId violates the constraint instead of replacing
   * the artwork.
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
    UPDATE hreasy_capability_modules SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<ModuleRow>(executor, sql, values);
  return result.rows[0] ? toModule(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyCapabilityModule | null> => {
  const result = await runQuery<ModuleRow>(
    executor,
    `UPDATE hreasy_capability_modules SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${RETURNING_COLUMNS}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toModule(result.rows[0]) : null;
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
    `UPDATE hreasy_capability_modules AS cm
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE cm.id = ordered.id`,
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
    'SELECT id FROM hreasy_capability_modules WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM hreasy_capability_modules WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
