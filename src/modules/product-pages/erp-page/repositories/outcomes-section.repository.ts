// src/modules/product-pages/erp-page/repositories/outcomes-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateErpOutcomeCardInput,
  ErpOutcomeCard,
  ErpOutcomeCardFilters,
  UpdateErpOutcomeCardInput,
} from '../types/outcomes-section.types';

/** One table: the carousel is a flat list of cards in their authored order. */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  industry: 'c.industry',
  stat: 'c.stat',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/**
 * Columns an update may touch directly. The image pair is absent because it
 * needs the "setting one clears the other" handling below, and updated_by is
 * absent because it comes from the request context.
 */
const UPDATABLE: Readonly<Record<string, string>> = {
  industry: 'industry',
  stat: 'stat',
  statLabel: 'stat_label',
  quote: 'quote',
  authorRole: 'author_role',
  authorCompany: 'author_company',
  imageAlt: 'image_alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const COLUMNS = `
  c.id, c.industry, c.stat, c.stat_label, c.quote,
  c.author_role, c.author_company,
  c.image_url, c.image_file_id, c.image_alt,
  c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const RETURNING = `
  id, industry, stat, stat_label, quote,
  author_role, author_company,
  image_url, image_file_id, image_alt,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CardRow {
  id: string;
  industry: string;
  stat: string;
  stat_label: string;
  quote: string;
  author_role: string;
  author_company: string;
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

const toCard = (row: CardRow): ErpOutcomeCard => ({
  id: row.id,
  industry: row.industry,
  stat: row.stat,
  statLabel: row.stat_label,
  quote: row.quote,
  authorRole: row.author_role,
  authorCompany: row.author_company,
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
): Promise<ErpOutcomeCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${COLUMNS} FROM erp_outcome_cards c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpOutcomeCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${COLUMNS} FROM erp_outcome_cards c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findAll = async (
  filters: ErpOutcomeCardFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ErpOutcomeCard>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      `(c.industry ILIKE ? OR c.stat ILIKE ? OR c.stat_label ILIKE ?
        OR c.quote ILIKE ? OR c.author_role ILIKE ? OR c.author_company ILIKE ?)`,
      ...Array.from({ length: 6 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the carousel.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM erp_outcome_cards c
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, c.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<CardRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toCard),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublished = async (executor?: Executor): Promise<ErpOutcomeCard[]> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${COLUMNS} FROM erp_outcome_cards c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCard);
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_outcome_cards',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM erp_outcome_cards',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateErpOutcomeCardInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpOutcomeCard> => {
  const result = await runQuery<CardRow>(
    executor,
    `INSERT INTO erp_outcome_cards
       (industry, stat, stat_label, quote, author_role, author_company,
        image_url, image_file_id, image_alt, display_order, status,
        created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
     RETURNING ${RETURNING}`,
    [
      input.industry,
      input.stat,
      input.statLabel,
      input.quote,
      input.authorRole,
      input.authorCompany,
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
  patch: UpdateErpOutcomeCardInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpOutcomeCard | null> => {
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
   * The two image columns are mutually exclusive by CHECK, so setting one has
   * to clear the other in the same statement. Without this, patching a URL onto
   * a card that already holds a file id violates the constraint instead of
   * replacing the photograph.
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

  const result = await runQuery<CardRow>(
    executor,
    `UPDATE erp_outcome_cards SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${RETURNING}`,
    values,
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpOutcomeCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `UPDATE erp_outcome_cards SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${RETURNING}`,
    [id, status, updatedBy],
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
    `UPDATE erp_outcome_cards AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM erp_outcome_cards WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_outcome_cards WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
