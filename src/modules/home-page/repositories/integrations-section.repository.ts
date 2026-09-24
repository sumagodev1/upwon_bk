// src/modules/home-page/repositories/integrations-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateIntegrationsEntryInput,
  IntegrationsEntry,
  IntegrationsEntryFilters,
  UpdateIntegrationsEntryInput,
} from '../types/integrations-section.types';

/**
 * One table, one row per orbit logo - the same shape as the other home page
 * sections, so all five repositories read the same way.
 */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  logoAlt: 'ie.logo_alt',
  displayOrder: 'ie.display_order',
  status: 'ie.status',
  createdAt: 'ie.created_at',
  updatedAt: 'ie.updated_at',
} as const;

/**
 * Columns an update may touch. The four image columns are absent because they
 * need the "setting one clears the other" handling below, and updated_by is
 * absent because it comes from the request context, never from the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  logoAlt: 'logo_alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  ie.id,
  ie.centre_logo_url, ie.centre_logo_file_id,
  ie.logo_url, ie.logo_file_id, ie.logo_alt,
  ie.display_order, ie.status,
  ie.created_by, ie.updated_by, ie.created_at, ie.updated_at
`;

const RETURNING_COLUMNS = `
  id,
  centre_logo_url, centre_logo_file_id,
  logo_url, logo_file_id, logo_alt,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface EntryRow {
  id: string;
  centre_logo_url: string | null;
  centre_logo_file_id: string | null;
  logo_url: string | null;
  logo_file_id: string | null;
  logo_alt: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toEntry = (row: EntryRow): IntegrationsEntry => ({
  id: row.id,
  centreLogoUrl: row.centre_logo_url,
  centreLogoFileId: row.centre_logo_file_id,
  logoUrl: row.logo_url,
  logoFileId: row.logo_file_id,
  logoAlt: row.logo_alt,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * created_at is the tiebreaker rather than id, so two entries sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
const PUBLISHED_ORDER = 'ORDER BY ie.display_order ASC, ie.created_at ASC';

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<IntegrationsEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_integrations_entries ie WHERE ie.id = $1`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<IntegrationsEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_integrations_entries ie
      WHERE ie.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

export const findAll = async (
  filters: IntegrationsEntryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<IntegrationsEntry>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'ie.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      'ie.logo_alt ILIKE ?',
      `%${pagination.search}%`,
    );
  }

  // Display order is the default: the admin list should read like the section.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM home_integrations_entries ie
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, ie.created_at ASC
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

/** The public read path: every ACTIVE entry, in order. */
export const findPublished = async (
  executor?: Executor,
): Promise<IntegrationsEntry[]> => {
  const result = await runQuery<EntryRow>(
    executor,
    `SELECT ${QUALIFIED_COLUMNS} FROM home_integrations_entries ie
      WHERE ie.status = 'ACTIVE'
     ${PUBLISHED_ORDER}`,
    [],
  );
  return result.rows.map(toEntry);
};

export const countAll = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM home_integrations_entries',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM home_integrations_entries',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateIntegrationsEntryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<IntegrationsEntry> => {
  const sql = `
    INSERT INTO home_integrations_entries
      (centre_logo_url, centre_logo_file_id,
       logo_url, logo_file_id, logo_alt, display_order, status,
       created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<EntryRow>(executor, sql, [
    input.centreLogoUrl,
    input.centreLogoFileId,
    input.logoUrl,
    input.logoFileId,
    input.logoAlt,
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toEntry(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateIntegrationsEntryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<IntegrationsEntry | null> => {
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
   * Each pair of image columns is mutually exclusive by CHECK, so setting one
   * has to clear the other in the same statement. Without this, patching a URL
   * onto an entry that already has a file id violates the constraint instead
   * of replacing the image.
   */
  const assignExclusivePair = (
    urlColumn: string,
    fileColumn: string,
    url: string | null | undefined,
    fileId: string | null | undefined,
  ): void => {
    if (url !== undefined) {
      assign(urlColumn, url);
      if (url !== null && fileId === undefined) assign(fileColumn, null);
    }
    if (fileId !== undefined) {
      assign(fileColumn, fileId);
      if (fileId !== null && url === undefined) assign(urlColumn, null);
    }
  };

  assignExclusivePair('logo_url', 'logo_file_id', patch.logoUrl, patch.logoFileId);
  assignExclusivePair(
    'centre_logo_url',
    'centre_logo_file_id',
    patch.centreLogoUrl,
    patch.centreLogoFileId,
  );

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const sql = `
    UPDATE home_integrations_entries SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<EntryRow>(executor, sql, values);
  return result.rows[0] ? toEntry(result.rows[0]) : null;
};

/**
 * Copies one entry's centre logo onto every other row.
 *
 * The centre logo is one image for the whole section but is stored per row, so
 * an edit that changed only the row it was made on would leave the section
 * showing whichever logo happened to sit on the first active entry. Called by
 * the service whenever a write touches either centre column.
 */
export const syncCentreLogo = async (
  sourceId: string,
  centreLogoUrl: string | null,
  centreLogoFileId: string | null,
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  const result = await runQuery(
    executor,
    `UPDATE home_integrations_entries
        SET centre_logo_url = $2, centre_logo_file_id = $3, updated_by = $4
      WHERE id <> $1
        AND (centre_logo_url IS DISTINCT FROM $2
             OR centre_logo_file_id IS DISTINCT FROM $3)`,
    [sourceId, centreLogoUrl, centreLogoFileId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<IntegrationsEntry | null> => {
  const result = await runQuery<EntryRow>(
    executor,
    `UPDATE home_integrations_entries SET status = $2, updated_by = $3
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
    `UPDATE home_integrations_entries AS ie
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE ie.id = ordered.id`,
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
    'SELECT id FROM home_integrations_entries WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM home_integrations_entries WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};

/**
 * The centre logo the section is currently showing.
 *
 * Reads the row the public endpoint would take it from: the first active entry
 * in display order, or any entry when none is active. Used on create, so a new
 * entry added without one inherits the section's rather than blanking it.
 */
export const findSectionCentreLogo = async (
  executor?: Executor,
): Promise<{ centreLogoUrl: string | null; centreLogoFileId: string | null } | null> => {
  const result = await runQuery<Pick<EntryRow, 'centre_logo_url' | 'centre_logo_file_id'>>(
    executor,
    `SELECT ie.centre_logo_url, ie.centre_logo_file_id
       FROM home_integrations_entries ie
      ORDER BY (ie.status = 'ACTIVE') DESC, ie.display_order ASC, ie.created_at ASC
      LIMIT 1`,
    [],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { centreLogoUrl: row.centre_logo_url, centreLogoFileId: row.centre_logo_file_id };
};
