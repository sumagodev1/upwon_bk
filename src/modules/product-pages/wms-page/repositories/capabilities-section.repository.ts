// src/modules/product-pages/wms-page/repositories/capabilities-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateWmsCapabilityModuleInput,
  UpdateWmsCapabilityModuleInput,
  WmsCapabilityModule,
  WmsCapabilityModuleFilters,
} from '../types/capabilities-section.types';

/** One table behind the section: the bands in the stack. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'm.title',
  displayOrder: 'm.display_order',
  status: 'm.status',
  createdAt: 'm.created_at',
  updatedAt: 'm.updated_at',
} as const;

/** Columns an update may touch directly; updated_by comes from the context. */
const UPDATABLE: Readonly<Record<string, string>> = {
  title: 'title',
  description: 'description',
  imageAlt: 'image_alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  m.id, m.title, m.description, m.image_url, m.image_file_id, m.image_alt,
  m.display_order, m.status,
  m.created_by, m.updated_by, m.created_at, m.updated_at
`;

const RETURNING = `
  id, title, description, image_url, image_file_id, image_alt,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface Row {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  image_file_id: string | null;
  image_alt: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toModule = (row: Row): WmsCapabilityModule => ({
  id: row.id,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  imageAlt: row.image_alt,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<WmsCapabilityModule | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM wms_capability_modules m WHERE m.id = $1`,
    [id],
  );
  return result.rows[0] ? toModule(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WmsCapabilityModule | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM wms_capability_modules m WHERE m.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toModule(result.rows[0]) : null;
};

export const findAll = async (
  filters: WmsCapabilityModuleFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<WmsCapabilityModule>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'm.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(m.title ILIKE ? OR m.description ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the page,
  // which runs top to bottom.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM wms_capability_modules m
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, m.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<Row & { total_count: number }>(executor, sql, builder.getValues());

  return {
    rows: result.rows.map(toModule),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<WmsCapabilityModule[]> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM wms_capability_modules m
      WHERE m.status = 'ACTIVE'
      ORDER BY m.display_order ASC, m.created_at ASC`,
    [],
  );
  return result.rows.map(toModule);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM wms_capability_modules',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM wms_capability_modules',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateWmsCapabilityModuleInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WmsCapabilityModule> => {
  const result = await runQuery<Row>(
    executor,
    `INSERT INTO wms_capability_modules
       (title, description, image_url, image_file_id, image_alt,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING ${RETURNING}`,
    [
      input.title,
      input.description,
      input.imageUrl,
      input.imageFileId,
      input.imageAlt,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toModule(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateWmsCapabilityModuleInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WmsCapabilityModule | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  /*
   * Exactly one image source may be set, so naming one has to clear the other
   * in the same statement. Without this, patching imageUrl onto a band that
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

  const result = await runQuery<Row>(
    executor,
    `UPDATE wms_capability_modules SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toModule(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE wms_capability_modules AS m
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE m.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM wms_capability_modules WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM wms_capability_modules WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
