// src/modules/product-pages/vendor-portal-page/repositories/proof-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { VmsIconName } from '../utils/icons';
import {
  CreateVmsProofTileInput,
  UpdateVmsProofTileInput,
  VmsProofDirection,
  VmsProofTile,
  VmsProofTileFilters,
  VmsProofTileKind,
} from '../types/proof-section.types';

/** One table behind the section: the tiles in the bento, of two kinds. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 't.title',
  kind: 't.kind',
  displayOrder: 't.display_order',
  status: 't.status',
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
} as const;

/** Columns an update may touch directly; the images are handled separately. */
const UPDATABLE: Readonly<Record<string, string>> = {
  colSpan: 'col_span',
  icon: 'icon',
  value: 'value',
  direction: 'direction',
  title: 'title',
  description: 'description',
  imageAlt: 'image_alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  t.id, t.kind, t.col_span,
  t.icon, t.value, t.direction, t.title, t.description,
  t.image_url, t.image_file_id, t.image_alt,
  t.display_order, t.status,
  t.created_by, t.updated_by, t.created_at, t.updated_at
`;

const RETURNING = `
  id, kind, col_span,
  icon, value, direction, title, description,
  image_url, image_file_id, image_alt,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface Row {
  id: string;
  kind: string;
  col_span: number;
  icon: string | null;
  value: string | null;
  direction: string | null;
  title: string | null;
  description: string | null;
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

const toTile = (row: Row): VmsProofTile => ({
  id: row.id,
  kind: row.kind as VmsProofTileKind,
  colSpan: row.col_span,
  icon: row.icon as VmsIconName | null,
  value: row.value,
  direction: row.direction as VmsProofDirection | null,
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

export const findById = async (id: string, executor?: Executor): Promise<VmsProofTile | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_proof_tiles t WHERE t.id = $1`,
    [id],
  );
  return result.rows[0] ? toTile(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<VmsProofTile | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_proof_tiles t WHERE t.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toTile(result.rows[0]) : null;
};

export const findAll = async (
  filters: VmsProofTileFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<VmsProofTile>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 't.status',
    operator: '=',
    value: filters.status,
  });
  builder.whereIf(filters.kind, { column: 't.kind', operator: '=', value: filters.kind });
  if (pagination.search) {
    // A picture tile has no title or copy, so its alt text is the only thing
    // a search could match it on.
    builder.raw(
      '(t.title ILIKE ? OR t.description ILIKE ? OR t.image_alt ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default, and here it is the layout rather than just
  // a sequence: the bento lays its tiles out in this order.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM vms_proof_tiles t
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, t.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<Row & { total_count: number }>(executor, sql, builder.getValues());

  return {
    rows: result.rows.map(toTile),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<VmsProofTile[]> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_proof_tiles t
      WHERE t.status = 'ACTIVE'
      ORDER BY t.display_order ASC, t.created_at ASC`,
    [],
  );
  return result.rows.map(toTile);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM vms_proof_tiles',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM vms_proof_tiles',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateVmsProofTileInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<VmsProofTile> => {
  const result = await runQuery<Row>(
    executor,
    `INSERT INTO vms_proof_tiles
       (kind, col_span, icon, value, direction, title, description,
        image_url, image_file_id, image_alt,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
     RETURNING ${RETURNING}`,
    [
      input.kind,
      input.colSpan,
      input.icon,
      input.value,
      input.direction,
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
  return toTile(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateVmsProofTileInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<VmsProofTile | null> => {
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
   * in the same statement. Without this, patching imageUrl onto a tile that
   * already has an imageFileId violates the constraint instead of replacing
   * the picture.
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
    `UPDATE vms_proof_tiles SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toTile(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE vms_proof_tiles AS t
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE t.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM vms_proof_tiles WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM vms_proof_tiles WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
