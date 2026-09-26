// src/modules/industry-pages/beverage-page/repositories/platform-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { BeverageIconName } from '../utils/icons';
import {
  CreateBeveragePlatformWorkflowInput,
  BeveragePlatformPanel,
  BeveragePlatformWorkflow,
  BeveragePlatformWorkflowFilters,
  UpdateBeveragePlatformWorkflowInput,
  UpsertBeveragePlatformPanelInput,
} from '../types/platform-section.types';

/**
 * Two tables behind one section: the panel (one row, read and replaced) and
 * the workflows (a list).
 */

// ── the panel ─────────────────────────────────────────────────────────────

const PANEL_COLUMNS = `
  id, image_url, image_file_id, list_label,
  created_by, updated_by, created_at, updated_at
`;

interface PanelRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  list_label: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toPanel = (row: PanelRow): BeveragePlatformPanel => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  listLabel: row.list_label,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findPanel = async (
  executor?: Executor,
): Promise<BeveragePlatformPanel | null> => {
  const result = await runQuery<PanelRow>(
    executor,
    `SELECT ${PANEL_COLUMNS} FROM beverage_platform_panel LIMIT 1`,
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
  input: UpsertBeveragePlatformPanelInput,
  adminId: string | null,
  executor?: Executor,
): Promise<BeveragePlatformPanel> => {
  const result = await runQuery<PanelRow>(
    executor,
    `INSERT INTO beverage_platform_panel
       (singleton, image_url, image_file_id, list_label, created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $4)
     ON CONFLICT (singleton) DO UPDATE
        SET image_url = EXCLUDED.image_url,
            image_file_id = EXCLUDED.image_file_id,
            list_label = EXCLUDED.list_label,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${PANEL_COLUMNS}`,
    [input.imageUrl, input.imageFileId, input.listLabel, adminId],
  );
  return toPanel(result.rows[0]);
};

// ── the workflows ─────────────────────────────────────────────────────────

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

interface WorkflowRow {
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

const toWorkflow = (row: WorkflowRow): BeveragePlatformWorkflow => ({
  id: row.id,
  label: row.label,
  icon: row.icon as BeverageIconName,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findWorkflowById = async (
  id: string,
  executor?: Executor,
): Promise<BeveragePlatformWorkflow | null> => {
  const result = await runQuery<WorkflowRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM beverage_platform_workflows c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toWorkflow(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findWorkflowByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BeveragePlatformWorkflow | null> => {
  const result = await runQuery<WorkflowRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM beverage_platform_workflows c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toWorkflow(result.rows[0]) : null;
};

export const findAllWorkflows = async (
  filters: BeveragePlatformWorkflowFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BeveragePlatformWorkflow>> => {
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

  // Display order is the default: the admin list should read like the column.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM beverage_platform_workflows c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<WorkflowRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toWorkflow),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE workflow, in order. */
export const findPublishedWorkflows = async (
  executor?: Executor,
): Promise<BeveragePlatformWorkflow[]> => {
  const result = await runQuery<WorkflowRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM beverage_platform_workflows c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toWorkflow);
};

export const countWorkflows = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM beverage_platform_workflows',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextWorkflowOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM beverage_platform_workflows',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createWorkflow = async (
  input: CreateBeveragePlatformWorkflowInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BeveragePlatformWorkflow> => {
  const result = await runQuery<WorkflowRow>(
    executor,
    `INSERT INTO beverage_platform_workflows
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
  return toWorkflow(result.rows[0]);
};

export const updateWorkflow = async (
  id: string,
  patch: UpdateBeveragePlatformWorkflowInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BeveragePlatformWorkflow | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findWorkflowById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<WorkflowRow>(
    executor,
    `UPDATE beverage_platform_workflows SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toWorkflow(result.rows[0]) : null;
};

/**
 * Rewrites display_order for the given ids in one statement, each row's
 * position taken from its index in the array.
 */
export const applyWorkflowOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE beverage_platform_workflows AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

/** Returns the ids that actually exist, so a reorder can reject unknown ones. */
export const findExistingWorkflowIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM beverage_platform_workflows WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeWorkflow = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM beverage_platform_workflows WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
