// src/modules/vs-sap-page/repositories/capabilities.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateVsSapCapabilityInput,
  UpdateVsSapCapabilityInput,
  VsSapCapability,
  VsSapCapabilityFilters,
} from '../types/comparison.types';

/**
 * Columns an update may touch. created_by / updated_by come from the request
 * context, never from the body, and display_order is absent because position is
 * changed only by applyOrder(), which rewrites the whole set.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  capability: 'capability',
  upwon: 'upwon',
  sap: 'sap',
  netsuite: 'netsuite',
  status: 'status',
} as const;

const COLUMNS = `
  id, capability, upwon, sap, netsuite,
  status, display_order, created_by, updated_by, created_at, updated_at
`;

/** created_at breaks display_order ties, so the list order is stable. */
const CAPABILITY_ORDER = 'ORDER BY display_order ASC, created_at ASC';

interface VsSapCapabilityRow {
  id: string;
  capability: string;
  upwon: number;
  sap: number;
  netsuite: number;
  status: string;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCapability = (row: VsSapCapabilityRow): VsSapCapability => ({
  id: row.id,
  capability: row.capability,
  upwon: row.upwon,
  sap: row.sap,
  netsuite: row.netsuite,
  status: row.status as ContentStatus,
  displayOrder: row.display_order,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * Every row, unpaginated. MAX_VS_SAP_CAPABILITIES keeps the set small enough
 * that paging would only add a round trip, and the admin table is the reorder
 * list, which has to show every row to be usable.
 */
export const findAll = async (
  filters: VsSapCapabilityFilters,
  executor?: Executor,
): Promise<VsSapCapability[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'status',
    operator: '=',
    value: filters.status,
  });
  if (filters.search) {
    builder.raw('capability ILIKE ?', `%${filters.search}%`);
  }

  const sql = `
    SELECT ${COLUMNS}
      FROM vs_sap_capabilities
    ${builder.buildWhere()}
    ${CAPABILITY_ORDER}
  `;
  const result = await runQuery<VsSapCapabilityRow>(executor, sql, builder.getValues());
  return result.rows.map(toCapability);
};

/** The public list: ACTIVE only, in display order. */
export const findPublished = async (executor?: Executor): Promise<VsSapCapability[]> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM vs_sap_capabilities
     WHERE status = 'ACTIVE'
    ${CAPABILITY_ORDER}
  `;
  const result = await runQuery<VsSapCapabilityRow>(executor, sql, []);
  return result.rows.map(toCapability);
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<VsSapCapability | null> => {
  const result = await runQuery<VsSapCapabilityRow>(
    executor,
    `SELECT ${COLUMNS} FROM vs_sap_capabilities WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

/** Locks the row, so two administrators editing the same row serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<VsSapCapability | null> => {
  const result = await runQuery<VsSapCapabilityRow>(
    executor,
    `SELECT ${COLUMNS} FROM vs_sap_capabilities WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM vs_sap_capabilities',
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end of the table" default on create. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM vs_sap_capabilities',
  );
  return Number(result.rows[0]?.next ?? 0);
};

/** Returns the ids that exist, so a reorder can reject the rest. */
export const findExistingIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM vs_sap_capabilities WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateVsSapCapabilityInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<VsSapCapability> => {
  const sql = `
    INSERT INTO vs_sap_capabilities
      (capability, upwon, sap, netsuite, status, display_order, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<VsSapCapabilityRow>(executor, sql, [
    input.capability,
    input.upwon,
    input.sap,
    input.netsuite,
    input.status,
    input.displayOrder,
    createdBy,
  ]);
  return toCapability(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateVsSapCapabilityInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<VsSapCapability | null> => {
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

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    UPDATE vs_sap_capabilities SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<VsSapCapabilityRow>(executor, sql, values);
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<VsSapCapability | null> => {
  const sql = `
    UPDATE vs_sap_capabilities SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<VsSapCapabilityRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toCapability(result.rows[0]) : null;
};

/**
 * Rewrites display_order for every listed row in one statement, each row's
 * position taken from its index in the array.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const sql = `
    UPDATE vs_sap_capabilities AS c
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE c.id = ordered.id
  `;
  const result = await runQuery(executor, sql, [orderedIds, updatedBy]);
  return result.rowCount ?? 0;
};

/** A hard delete; INACTIVE covers "not in the table right now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM vs_sap_capabilities WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
