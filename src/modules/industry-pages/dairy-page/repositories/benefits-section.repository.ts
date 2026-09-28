// src/modules/industry-pages/dairy-page/repositories/benefits-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateDairyBenefitItemInput,
  DairyBenefitItem,
  DairyBenefitItemFilters,
  DairyBenefitsPanel,
  UpsertDairyBenefitsPanelInput,
  UpdateDairyBenefitItemInput,
} from '../types/benefits-section.types';

/** One table, one row per benefit. Soft-deleted rows are invisible to every read. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'bi.title',
  description: 'bi.description',
  displayOrder: 'bi.display_order',
  status: 'bi.status',
  createdAt: 'bi.created_at',
  updatedAt: 'bi.updated_at',
} as const;

const QUALIFIED_COLUMNS = `
  bi.id, bi.icon, bi.title, bi.description,
  bi.display_order, bi.status,
  bi.created_by, bi.updated_by, bi.created_at, bi.updated_at
`;

const RETURNING_COLUMNS = `
  id, icon, title, description,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface ItemRow {
  id: string;
  icon: string;
  title: string;
  description: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toItem = (row: ItemRow): DairyBenefitItem => ({
  id: row.id,
  icon: row.icon,
  title: row.title,
  description: row.description,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<DairyBenefitItem | null> => {
  const result = await runQuery<ItemRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM dairy_benefit_items bi WHERE bi.id = $1 AND bi.deleted_at IS NULL`,
    [id],
  );
  return result.rows[0] ? toItem(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<DairyBenefitItem | null> => {
  const result = await runQuery<ItemRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM dairy_benefit_items bi WHERE bi.id = $1 AND bi.deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toItem(result.rows[0]) : null;
};

export const findAll = async (
  filters: DairyBenefitItemFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<DairyBenefitItem>> => {
  const builder = new SqlBuilder();
  // Soft-deleted rows are gone from every admin list and search.
  builder.raw('bi.deleted_at IS NULL');
  builder.whereIf(filters.status, { column: 'bi.status', operator: '=', value: filters.status });
  if (pagination.search) {
    builder.raw(
      '(bi.icon ILIKE ? OR bi.title ILIKE ? OR bi.description ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const result = await runQuery<ItemRow & { total_count: number }>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
       FROM dairy_benefit_items bi
     ${builder.buildWhere()}
      ORDER BY ${sort.column} ${sort.order}, bi.created_at ASC
     ${builder.buildLimitOffset(pagination.limit, pagination.offset)}`,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toItem),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every live ACTIVE benefit, in order. */
export const findPublished = async (executor?: Executor): Promise<DairyBenefitItem[]> => {
  const result = await runQuery<ItemRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM dairy_benefit_items bi
      WHERE bi.status = 'ACTIVE' AND bi.deleted_at IS NULL
     ORDER BY bi.display_order ASC, bi.created_at ASC`,
    [],
  );
  return result.rows.map(toItem);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM dairy_benefit_items WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM dairy_benefit_items WHERE deleted_at IS NULL',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

/** Feeds the duplicate check: two live benefits with the same title read as a mistake. */
export const findByTitle = async (
  value: string,
  executor?: Executor,
): Promise<DairyBenefitItem | null> => {
  const result = await runQuery<ItemRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM dairy_benefit_items bi
      WHERE lower(bi.title) = lower($1) AND bi.deleted_at IS NULL
      LIMIT 1`,
    [value],
  );
  return result.rows[0] ? toItem(result.rows[0]) : null;
};

export const create = async (
  input: CreateDairyBenefitItemInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<DairyBenefitItem> => {
  const result = await runQuery<ItemRow>(
    executor,
    `INSERT INTO dairy_benefit_items
       (icon, title, description, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${RETURNING_COLUMNS}`,
    [
      input.icon,
      input.title,
      input.description,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toItem(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateDairyBenefitItemInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<DairyBenefitItem | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.icon !== undefined) assign('icon', patch.icon);
  if (patch.title !== undefined) assign('title', patch.title);
  if (patch.description !== undefined) assign('description', patch.description);
  if (patch.displayOrder !== undefined) assign('display_order', patch.displayOrder);
  if (patch.status !== undefined) assign('status', patch.status);

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<ItemRow>(
    executor,
    `UPDATE dairy_benefit_items SET ${assignments.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toItem(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE dairy_benefit_items AS bi
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE bi.id = ordered.id AND bi.deleted_at IS NULL`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM dairy_benefit_items WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/**
 * Soft delete: stamps deleted_at rather than removing the row, so the record
 * stays in the table for audit and recovery. Every read above ignores it.
 */
export const remove = async (
  id: string,
  deletedBy: string | null,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery(
    executor,
    `UPDATE dairy_benefit_items SET deleted_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL`,
    [id, deletedBy],
  );
  return (result.rowCount ?? 0) > 0;
};

// ── the panel image ───────────────────────────────────────────────────────
//
// One row, read and replaced. The singleton column is what an upsert conflicts on.

const PANEL_COLUMNS = `
  id, image_url, image_file_id, alt, created_by, updated_by, created_at, updated_at
`;

interface PanelRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  alt: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toPanel = (row: PanelRow): DairyBenefitsPanel => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  alt: row.alt,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findPanel = async (executor?: Executor): Promise<DairyBenefitsPanel | null> => {
  const result = await runQuery<PanelRow>(executor, `SELECT ${PANEL_COLUMNS} FROM dairy_benefits_panel LIMIT 1`, []);
  return result.rows[0] ? toPanel(result.rows[0]) : null;
};

/**
 * Creates the panel or replaces it. ON CONFLICT on `singleton`, which can only
 * ever be TRUE - so the first save creates the row and every later save
 * replaces it.
 */
export const upsertPanel = async (
  input: UpsertDairyBenefitsPanelInput,
  adminId: string | null,
  executor?: Executor,
): Promise<DairyBenefitsPanel> => {
  const result = await runQuery<PanelRow>(
    executor,
    `INSERT INTO dairy_benefits_panel (singleton, image_url, image_file_id, alt, created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $4)
     ON CONFLICT (singleton) DO UPDATE
        SET image_url = EXCLUDED.image_url,
            image_file_id = EXCLUDED.image_file_id,
            alt = EXCLUDED.alt,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${PANEL_COLUMNS}`,
    [input.imageUrl, input.imageFileId, input.alt, adminId],
  );
  return toPanel(result.rows[0]);
};
