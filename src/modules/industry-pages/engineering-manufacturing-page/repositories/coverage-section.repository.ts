// src/modules/industry-pages/engineering-manufacturing-page/repositories/coverage-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { EngineeringIconName } from '../utils/icons';
import {
  CreateEngineeringCoverageCategoryInput,
  EngineeringCoveragePanel,
  EngineeringCoverageCategory,
  EngineeringCoverageCategoryFilters,
  UpdateEngineeringCoverageCategoryInput,
  UpsertEngineeringCoveragePanelInput,
} from '../types/coverage-section.types';

/**
 * Two tables behind one section: the background panel (one row, read and
 * replaced) and the categories (a list).
 */

// ── the background panel ──────────────────────────────────────────────────

const PANEL_COLUMNS = `
  id, image_url, image_file_id,
  created_by, updated_by, created_at, updated_at
`;

interface PanelRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toPanel = (row: PanelRow): EngineeringCoveragePanel => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findPanel = async (
  executor?: Executor,
): Promise<EngineeringCoveragePanel | null> => {
  const result = await runQuery<PanelRow>(
    executor,
    `SELECT ${PANEL_COLUMNS} FROM engineering_coverage_panel LIMIT 1`,
    [],
  );
  return result.rows[0] ? toPanel(result.rows[0]) : null;
};

/**
 * Creates the panel or replaces it.
 *
 * ON CONFLICT on `singleton`, which can only ever be TRUE - so the first save
 * creates the row and every later save replaces it.
 */
export const upsertPanel = async (
  input: UpsertEngineeringCoveragePanelInput,
  adminId: string | null,
  executor?: Executor,
): Promise<EngineeringCoveragePanel> => {
  const result = await runQuery<PanelRow>(
    executor,
    `INSERT INTO engineering_coverage_panel
       (singleton, image_url, image_file_id, created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $3)
     ON CONFLICT (singleton) DO UPDATE
        SET image_url = EXCLUDED.image_url,
            image_file_id = EXCLUDED.image_file_id,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${PANEL_COLUMNS}`,
    [input.imageUrl, input.imageFileId, adminId],
  );
  return toPanel(result.rows[0]);
};

// ── the categories ────────────────────────────────────────────────────────

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'c.label',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/** Columns an update may touch. updated_by comes from the request context. */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  label: 'label',
  icon: 'icon',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  c.id, c.label, c.icon,
  c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const RETURNING_COLUMNS = `
  id, label, icon,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CategoryRow {
  id: string;
  label: string;
  icon: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCategory = (row: CategoryRow): EngineeringCoverageCategory => ({
  id: row.id,
  label: row.label,
  icon: row.icon as EngineeringIconName,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCategoryById = async (
  id: string,
  executor?: Executor,
): Promise<EngineeringCoverageCategory | null> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM engineering_coverage_categories c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findCategoryByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<EngineeringCoverageCategory | null> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM engineering_coverage_categories c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

export const findAllCategories = async (
  filters: EngineeringCoverageCategoryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<EngineeringCoverageCategory>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      'c.label ILIKE ?',
      `%${pagination.search}%`,
    );
  }

  // Display order is the default: the admin list should read like the grid.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM engineering_coverage_categories c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<CategoryRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toCategory),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE category, in order. */
export const findPublishedCategories = async (
  executor?: Executor,
): Promise<EngineeringCoverageCategory[]> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM engineering_coverage_categories c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCategory);
};

export const countCategories = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM engineering_coverage_categories',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextCategoryOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM engineering_coverage_categories',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createCategory = async (
  input: CreateEngineeringCoverageCategoryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<EngineeringCoverageCategory> => {
  const result = await runQuery<CategoryRow>(
    executor,
    `INSERT INTO engineering_coverage_categories
       (label, icon, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${RETURNING_COLUMNS}`,
    [
      input.label,
      input.icon,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toCategory(result.rows[0]);
};

export const updateCategory = async (
  id: string,
  patch: UpdateEngineeringCoverageCategoryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<EngineeringCoverageCategory | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findCategoryById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<CategoryRow>(
    executor,
    `UPDATE engineering_coverage_categories SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toCategory(result.rows[0]) : null;
};

/**
 * Rewrites display_order for the given ids in one statement, each row's
 * position taken from its index in the array.
 */
export const applyCategoryOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE engineering_coverage_categories AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

/** Returns the ids that actually exist, so a reorder can reject unknown ones. */
export const findExistingCategoryIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM engineering_coverage_categories WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeCategory = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM engineering_coverage_categories WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
