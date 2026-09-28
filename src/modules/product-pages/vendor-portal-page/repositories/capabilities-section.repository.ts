// src/modules/product-pages/vendor-portal-page/repositories/capabilities-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateVmsCapabilityCardInput,
  UpdateVmsCapabilityCardInput,
  VmsCapabilityCard,
  VmsCapabilityCardFilters,
} from '../types/capabilities-section.types';

/** One table behind the section: the cards in the carousel. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'c.title',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/** Columns an update may touch directly; the images are handled separately. */
const UPDATABLE: Readonly<Record<string, string>> = {
  title: 'title',
  description: 'description',
  imageAlt: 'image_alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  c.id, c.title, c.description, c.image_url, c.image_file_id, c.image_alt,
  c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const RETURNING = `
  id, title, description, image_url, image_file_id, image_alt,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface Row {
  id: string;
  title: string;
  description: string;
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

const toCard = (row: Row): VmsCapabilityCard => ({
  id: row.id,
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

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<VmsCapabilityCard | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_capability_cards c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<VmsCapabilityCard | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_capability_cards c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findAll = async (
  filters: VmsCapabilityCardFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<VmsCapabilityCard>> => {
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

  // Display order is the default: the admin list should read like the
  // carousel, and a card's number on the page is its position in it.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM vms_capability_cards c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<Row & { total_count: number }>(executor, sql, builder.getValues());

  return {
    rows: result.rows.map(toCard),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<VmsCapabilityCard[]> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_capability_cards c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCard);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM vms_capability_cards',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM vms_capability_cards',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateVmsCapabilityCardInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<VmsCapabilityCard> => {
  const result = await runQuery<Row>(
    executor,
    `INSERT INTO vms_capability_cards
       (title, description, image_url, image_file_id, image_alt,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING ${RETURNING}`,
    [
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
  return toCard(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateVmsCapabilityCardInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<VmsCapabilityCard | null> => {
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
   * in the same statement. Without this, patching imageUrl onto a card that
   * already has an imageFileId violates the constraint instead of replacing
   * the screenshot.
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
    `UPDATE vms_capability_cards SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE vms_capability_cards AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (ids: string[], executor?: Executor): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM vms_capability_cards WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM vms_capability_cards WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
