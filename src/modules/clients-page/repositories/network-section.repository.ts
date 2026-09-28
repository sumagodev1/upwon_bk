// src/modules/clients-page/repositories/network-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  ClientsNetworkCity,
  ClientsNetworkState,
  ClientsNetworkStateFilters,
  CreateClientsNetworkStateInput,
  NetworkZone,
  UpdateClientsNetworkStateInput,
} from '../types/network-section.types';

/** One table: the network is a flat list of states in their authored order. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  state: 's.state',
  zone: 's.zone',
  displayOrder: 's.display_order',
  status: 's.status',
  createdAt: 's.created_at',
  updatedAt: 's.updated_at',
} as const;

/** Columns an update may touch directly; `cities` is bound as jsonb below. */
const UPDATABLE: Readonly<Record<string, string>> = {
  state: 'state',
  zone: 'zone',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  s.id, s.state, s.zone, s.cities, s.display_order, s.status,
  s.created_by, s.updated_by, s.created_at, s.updated_at
`;

const RETURNING = `
  id, state, zone, cities, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface StateRow {
  id: string;
  state: string;
  zone: NetworkZone;
  cities: ClientsNetworkCity[];
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toState = (row: StateRow): ClientsNetworkState => ({
  id: row.id,
  state: row.state,
  zone: row.zone,
  cities: Array.isArray(row.cities) ? row.cities : [],
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
): Promise<ClientsNetworkState | null> => {
  const result = await runQuery<StateRow>(
    executor,
    `SELECT ${COLUMNS} FROM clients_network_states s WHERE s.id = $1`,
    [id],
  );
  return result.rows[0] ? toState(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ClientsNetworkState | null> => {
  const result = await runQuery<StateRow>(
    executor,
    `SELECT ${COLUMNS} FROM clients_network_states s WHERE s.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toState(result.rows[0]) : null;
};

export const findAll = async (
  filters: ClientsNetworkStateFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ClientsNetworkState>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 's.status', operator: '=', value: filters.status });
  if (pagination.search) {
    const term = `%${pagination.search}%`;
    // Matches a city name too, so "Pune" finds Maharashtra.
    builder.raw('(s.state ILIKE ? OR s.zone ILIKE ? OR s.cities::text ILIKE ?)', term, term, term);
  }

  // Display order is the default: the admin list should read like the grid.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM clients_network_states s
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, s.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<StateRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toState),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** Every ACTIVE state, in order, unpaginated - the cap keeps the set small. */
export const findPublished = async (executor?: Executor): Promise<ClientsNetworkState[]> => {
  const result = await runQuery<StateRow>(
    executor,
    `
    SELECT ${COLUMNS}
      FROM clients_network_states s
     WHERE s.status = 'ACTIVE'
     ORDER BY s.display_order ASC, s.created_at ASC
    `,
    [],
  );
  return result.rows.map(toState);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM clients_network_states',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM clients_network_states',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateClientsNetworkStateInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ClientsNetworkState> => {
  const result = await runQuery<StateRow>(
    executor,
    `
    INSERT INTO clients_network_states
      (state, zone, cities, display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3::jsonb, $4, $5, $6, $6)
    RETURNING ${RETURNING}
    `,
    [
      input.state,
      input.zone,
      JSON.stringify(input.cities),
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toState(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateClientsNetworkStateInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsNetworkState | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown, cast = ''): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}${cast}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }
  if (patch.cities !== undefined) {
    assign('cities', JSON.stringify(patch.cities), '::jsonb');
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<StateRow>(
    executor,
    `
    UPDATE clients_network_states SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING}
    `,
    values,
  );
  return result.rows[0] ? toState(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsNetworkState | null> => {
  const result = await runQuery<StateRow>(
    executor,
    `
    UPDATE clients_network_states SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${RETURNING}
    `,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toState(result.rows[0]) : null;
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
    UPDATE clients_network_states AS s
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE s.id = ordered.id
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
    'SELECT id FROM clients_network_states WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** A hard delete; INACTIVE covers "hide it for now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM clients_network_states WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
