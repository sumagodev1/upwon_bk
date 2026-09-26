// src/modules/industry-pages/beverage-page/repositories/capabilities-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  BeverageCapabilitiesPanel,
  BeverageCapability,
  BeverageCapabilityFilters,
  CreateBeverageCapabilityInput,
  UpdateBeverageCapabilityInput,
  UpsertBeverageCapabilitiesPanelInput,
} from '../types/capabilities-section.types';

/**
 * Two tables behind one section: the background panel (one row, read and
 * replaced) and the capabilities (a list).
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

const toPanel = (row: PanelRow): BeverageCapabilitiesPanel => ({
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
): Promise<BeverageCapabilitiesPanel | null> => {
  const result = await runQuery<PanelRow>(
    executor,
    `SELECT ${PANEL_COLUMNS} FROM beverage_capabilities_panel LIMIT 1`,
    [],
  );
  return result.rows[0] ? toPanel(result.rows[0]) : null;
};

/**
 * Creates the panel or replaces it. ON CONFLICT on `singleton`, which can only
 * ever be TRUE - so the first save creates the row and every later save
 * replaces it.
 */
export const upsertPanel = async (
  input: UpsertBeverageCapabilitiesPanelInput,
  adminId: string | null,
  executor?: Executor,
): Promise<BeverageCapabilitiesPanel> => {
  const result = await runQuery<PanelRow>(
    executor,
    `INSERT INTO beverage_capabilities_panel
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

// ── the capabilities ──────────────────────────────────────────────────────

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'c.title',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/** Columns an update may touch directly. The image pair is handled below. */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  title: 'title',
  description: 'description',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  c.id, c.title, c.description, c.image_url, c.image_file_id,
  c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const RETURNING_COLUMNS = `
  id, title, description, image_url, image_file_id,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CapabilityRow {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  image_file_id: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCapability = (row: CapabilityRow): BeverageCapability => ({
  id: row.id,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCapabilityById = async (
  id: string,
  executor?: Executor,
): Promise<BeverageCapability | null> => {
  const result = await runQuery<CapabilityRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM beverage_capabilities c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findCapabilityByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<BeverageCapability | null> => {
  const result = await runQuery<CapabilityRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM beverage_capabilities c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

export const findAllCapabilities = async (
  filters: BeverageCapabilityFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<BeverageCapability>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(c.title ILIKE ? OR c.description ILIKE ?)',
      ...Array.from({ length: 2 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the tabs.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM beverage_capabilities c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<CapabilityRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toCapability),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE capability, in order. */
export const findPublishedCapabilities = async (
  executor?: Executor,
): Promise<BeverageCapability[]> => {
  const result = await runQuery<CapabilityRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM beverage_capabilities c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCapability);
};

export const countCapabilities = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM beverage_capabilities',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextCapabilityOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM beverage_capabilities',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createCapability = async (
  input: CreateBeverageCapabilityInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<BeverageCapability> => {
  const result = await runQuery<CapabilityRow>(
    executor,
    `INSERT INTO beverage_capabilities
       (title, description, image_url, image_file_id,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING ${RETURNING_COLUMNS}`,
    [
      input.title,
      input.description,
      input.imageUrl,
      input.imageFileId,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toCapability(result.rows[0]);
};

/**
 * Setting one image source clears the other, so swapping an uploaded
 * screenshot for a hosted URL does not trip the table's exclusivity check.
 */
export const updateCapability = async (
  id: string,
  patch: UpdateBeverageCapabilityInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BeverageCapability | null> => {
  const effective: Record<string, unknown> = { ...patch };
  if (patch.imageUrl !== undefined && patch.imageUrl !== null) effective.imageFileId = null;
  if (patch.imageFileId !== undefined && patch.imageFileId !== null) effective.imageUrl = null;

  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = effective[key];
    if (value === undefined) continue;
    assign(column, value);
  }
  if (effective.imageUrl !== undefined) assign('image_url', effective.imageUrl);
  if (effective.imageFileId !== undefined) assign('image_file_id', effective.imageFileId);

  if (assignments.length === 0) return findCapabilityById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<CapabilityRow>(
    executor,
    `UPDATE beverage_capabilities SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

/**
 * Rewrites display_order for the given ids in one statement, each row's
 * position taken from its index in the array.
 */
export const applyCapabilityOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE beverage_capabilities AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

/** Returns the ids that actually exist, so a reorder can reject unknown ones. */
export const findExistingCapabilityIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM beverage_capabilities WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeCapability = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM beverage_capabilities WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
