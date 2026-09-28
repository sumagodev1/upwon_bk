// src/modules/clients-page/repositories/roster-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  ClientsRosterLogo,
  ClientsRosterLogoFilters,
  CreateClientsRosterLogoInput,
  UpdateClientsRosterLogoInput,
} from '../types/roster-section.types';

/** One table: the marquee is a flat list of logos in their authored order. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  name: 'l.name',
  displayOrder: 'l.display_order',
  status: 'l.status',
  createdAt: 'l.created_at',
  updatedAt: 'l.updated_at',
} as const;

/**
 * Columns an update may touch directly. The image pair is absent because it
 * needs the "setting one clears the other" handling in update().
 */
const UPDATABLE: Readonly<Record<string, string>> = {
  name: 'name',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  l.id, l.name, l.image_url, l.image_file_id, l.display_order, l.status,
  l.created_by, l.updated_by, l.created_at, l.updated_at
`;

const RETURNING = `
  id, name, image_url, image_file_id, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface LogoRow {
  id: string;
  name: string;
  image_url: string | null;
  image_file_id: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toLogo = (row: LogoRow): ClientsRosterLogo => ({
  id: row.id,
  name: row.name,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
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
): Promise<ClientsRosterLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${COLUMNS} FROM clients_roster_logos l WHERE l.id = $1`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ClientsRosterLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${COLUMNS} FROM clients_roster_logos l WHERE l.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findAll = async (
  filters: ClientsRosterLogoFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ClientsRosterLogo>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 'l.status', operator: '=', value: filters.status });
  if (pagination.search) {
    builder.raw('l.name ILIKE ?', `%${pagination.search}%`);
  }

  // Display order is the default: the admin list should read like the marquee.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM clients_roster_logos l
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, l.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<LogoRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toLogo),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** Every ACTIVE logo, in order, unpaginated - the cap keeps the set small. */
export const findPublished = async (executor?: Executor): Promise<ClientsRosterLogo[]> => {
  const result = await runQuery<LogoRow>(
    executor,
    `
    SELECT ${COLUMNS}
      FROM clients_roster_logos l
     WHERE l.status = 'ACTIVE'
     ORDER BY l.display_order ASC, l.created_at ASC
    `,
    [],
  );
  return result.rows.map(toLogo);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM clients_roster_logos',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM clients_roster_logos',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateClientsRosterLogoInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ClientsRosterLogo> => {
  const result = await runQuery<LogoRow>(
    executor,
    `
    INSERT INTO clients_roster_logos
      (name, image_url, image_file_id, display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $6)
    RETURNING ${RETURNING}
    `,
    [
      input.name,
      input.imageUrl,
      input.imageFileId,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toLogo(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateClientsRosterLogoInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsRosterLogo | null> => {
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
   * The image pair is mutually exclusive by CHECK constraint, so setting one
   * side clears the other in the same statement.
   */
  if (patch.imageUrl !== undefined) {
    assign('image_url', patch.imageUrl);
    if (patch.imageUrl !== null && patch.imageFileId === undefined) {
      assign('image_file_id', null);
    }
  }
  if (patch.imageFileId !== undefined) {
    assign('image_file_id', patch.imageFileId);
    if (patch.imageFileId !== null && patch.imageUrl === undefined) {
      assign('image_url', null);
    }
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<LogoRow>(
    executor,
    `
    UPDATE clients_roster_logos SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING}
    `,
    values,
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsRosterLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `
    UPDATE clients_roster_logos SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${RETURNING}
    `,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

/** Rewrites display_order for the given ids in one statement. */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `
    UPDATE clients_roster_logos AS l
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE l.id = ordered.id
    `,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

/** Returns the ids that actually exist, so a reorder can reject unknown ones. */
export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM clients_roster_logos WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** A hard delete; INACTIVE covers "hide it for now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM clients_roster_logos WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
