// src/modules/why-upwon-page/repositories/proof-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import { WhyUpwonIconName } from '../utils/icons';
import {
  CreateWhyUpwonProofCalloutInput,
  WhyUpwonProofPanel,
  WhyUpwonProofCallout,
  WhyUpwonProofCalloutFilters,
  UpdateWhyUpwonProofCalloutInput,
  UpsertWhyUpwonProofPanelInput,
} from '../types/proof-section.types';

/**
 * Two tables behind one section: the artwork panel (one row, read and
 * replaced) and the callouts (a list).
 */

// ── the artwork panel ─────────────────────────────────────────────────────

const PANEL_COLUMNS = `
  id, image_url, image_file_id, image_alt,
  created_by, updated_by, created_at, updated_at
`;

interface PanelRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  image_alt: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toPanel = (row: PanelRow): WhyUpwonProofPanel => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  imageAlt: row.image_alt,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findPanel = async (
  executor?: Executor,
): Promise<WhyUpwonProofPanel | null> => {
  const result = await runQuery<PanelRow>(
    executor,
    `SELECT ${PANEL_COLUMNS} FROM why_upwon_proof_panel LIMIT 1`,
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
  input: UpsertWhyUpwonProofPanelInput,
  adminId: string | null,
  executor?: Executor,
): Promise<WhyUpwonProofPanel> => {
  const result = await runQuery<PanelRow>(
    executor,
    `INSERT INTO why_upwon_proof_panel
       (singleton, image_url, image_file_id, image_alt, created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $4)
     ON CONFLICT (singleton) DO UPDATE
        SET image_url = EXCLUDED.image_url,
            image_file_id = EXCLUDED.image_file_id,
            image_alt = EXCLUDED.image_alt,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${PANEL_COLUMNS}`,
    [input.imageUrl, input.imageFileId, input.imageAlt, adminId],
  );
  return toPanel(result.rows[0]);
};

// ── the callouts ──────────────────────────────────────────────────────

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'c.title',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/** Columns an update may touch. updated_by comes from the request context. */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  title: 'title',
  description: 'description',
  icon: 'icon',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  c.id, c.title, c.description, c.icon, c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const RETURNING_COLUMNS = `
  id, title, description, icon, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CalloutRow {
  id: string;
  title: string;
  description: string;
  icon: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCallout = (row: CalloutRow): WhyUpwonProofCallout => ({
  id: row.id,
  title: row.title,
  description: row.description,
  icon: row.icon as WhyUpwonIconName,
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
): Promise<WhyUpwonProofCallout | null> => {
  const result = await runQuery<CalloutRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM why_upwon_proof_callouts c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCallout(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WhyUpwonProofCallout | null> => {
  const result = await runQuery<CalloutRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM why_upwon_proof_callouts c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCallout(result.rows[0]) : null;
};

export const findAll = async (
  filters: WhyUpwonProofCalloutFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<WhyUpwonProofCallout>> => {
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

  // Display order is the default: the admin list should read in corner order.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM why_upwon_proof_callouts c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<CalloutRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toCallout),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** The public read path: every ACTIVE callout, in order. */
export const findPublished = async (executor?: Executor): Promise<WhyUpwonProofCallout[]> => {
  const result = await runQuery<CalloutRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM why_upwon_proof_callouts c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCallout);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM why_upwon_proof_callouts',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM why_upwon_proof_callouts',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateWhyUpwonProofCalloutInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonProofCallout> => {
  const result = await runQuery<CalloutRow>(
    executor,
    `INSERT INTO why_upwon_proof_callouts
       (title, description, icon, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${RETURNING_COLUMNS}`,
    [input.title, input.description, input.icon, input.displayOrder, input.status, createdBy],
  );
  return toCallout(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateWhyUpwonProofCalloutInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WhyUpwonProofCallout | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<CalloutRow>(
    executor,
    `UPDATE why_upwon_proof_callouts SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING_COLUMNS}`,
    values,
  );
  return result.rows[0] ? toCallout(result.rows[0]) : null;
};

/**
 * Rewrites display_order for the given ids in one statement, each row's
 * position taken from its index in the array.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE why_upwon_proof_callouts AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
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
    'SELECT id FROM why_upwon_proof_callouts WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM why_upwon_proof_callouts WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
