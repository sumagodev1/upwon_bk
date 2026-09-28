// src/modules/product-pages/wms-page/repositories/proof-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateWmsProofCardInput,
  CreateWmsProofSlideInput,
  UpdateWmsProofCardInput,
  UpdateWmsProofSlideInput,
  WmsProofCard,
  WmsProofCardFilters,
  WmsProofSlide,
} from '../types/proof-section.types';

/**
 * Two tables: the cards and the slides they flip through. The slides are read
 * in bulk by card id rather than one query per card, so assembling the whole
 * row is two round trips.
 */

// ── the cards ─────────────────────────────────────────────────────────────

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'c.label',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/** Columns an update may touch directly; updated_by comes from the context. */
const CARD_UPDATABLE: Readonly<Record<string, string>> = {
  label: 'label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const CARD_COLUMNS = `
  c.id, c.label, c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const CARD_RETURNING = `
  id, label, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CardRow {
  id: string;
  label: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCard = (row: CardRow): WmsProofCard => ({
  id: row.id,
  label: row.label,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCardById = async (
  id: string,
  executor?: Executor,
): Promise<WmsProofCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM wms_proof_cards c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findCardByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WmsProofCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM wms_proof_cards c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findAllCards = async (
  filters: WmsProofCardFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<WmsProofCard>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw('(c.label ILIKE ?)', `%${pagination.search}%`);
  }

  // Display order is the default: the admin list should read like the row.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${CARD_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM wms_proof_cards c
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

/**
 * created_at is the tiebreaker rather than id, so two cards sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
export const findPublishedCards = async (executor?: Executor): Promise<WmsProofCard[]> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM wms_proof_cards c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCard);
};

export const countCards = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM wms_proof_cards',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextCardOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM wms_proof_cards',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createCard = async (
  input: CreateWmsProofCardInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WmsProofCard> => {
  const result = await runQuery<CardRow>(
    executor,
    `INSERT INTO wms_proof_cards (label, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING ${CARD_RETURNING}`,
    [input.label, input.displayOrder, input.status, createdBy],
  );
  return toCard(result.rows[0]);
};

export const updateCard = async (
  id: string,
  patch: UpdateWmsProofCardInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WmsProofCard | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(CARD_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  if (assignments.length === 0) return findCardById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<CardRow>(
    executor,
    `UPDATE wms_proof_cards SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${CARD_RETURNING}`,
    values,
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const updateCardStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WmsProofCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `UPDATE wms_proof_cards SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${CARD_RETURNING}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const applyCardOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE wms_proof_cards AS c
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE c.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingCardIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM wms_proof_cards WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** The slides go with it - wms_proof_slides cascades on delete. */
export const removeCard = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM wms_proof_cards WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── the slides ────────────────────────────────────────────────────────────

const SLIDE_UPDATABLE: Readonly<Record<string, string>> = {
  alt: 'alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const SLIDE_COLUMNS = `
  s.id, s.card_id, s.image_url, s.image_file_id, s.alt,
  s.display_order, s.status,
  s.created_by, s.updated_by, s.created_at, s.updated_at
`;

const SLIDE_RETURNING = `
  id, card_id, image_url, image_file_id, alt,
  display_order, status, created_by, updated_by, created_at, updated_at
`;

interface SlideRow {
  id: string;
  card_id: string;
  image_url: string | null;
  image_file_id: string | null;
  alt: string | null;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSlide = (row: SlideRow): WmsProofSlide => ({
  id: row.id,
  cardId: row.card_id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  alt: row.alt,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findSlideById = async (
  id: string,
  executor?: Executor,
): Promise<WmsProofSlide | null> => {
  const result = await runQuery<SlideRow>(
    executor,
    `SELECT ${SLIDE_COLUMNS} FROM wms_proof_slides s WHERE s.id = $1`,
    [id],
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const findSlideByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<WmsProofSlide | null> => {
  const result = await runQuery<SlideRow>(
    executor,
    `SELECT ${SLIDE_COLUMNS} FROM wms_proof_slides s WHERE s.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

/** One card's slides, every status, in order. */
export const findSlidesByCard = async (
  cardId: string,
  executor?: Executor,
): Promise<WmsProofSlide[]> => {
  const result = await runQuery<SlideRow>(
    executor,
    `SELECT ${SLIDE_COLUMNS} FROM wms_proof_slides s
      WHERE s.card_id = $1
      ORDER BY s.display_order ASC, s.created_at ASC`,
    [cardId],
  );
  return result.rows.map(toSlide);
};

/**
 * Every active slide for the given cards, in one query.
 *
 * Assembling the row otherwise means a query per card - one round trip per
 * column for content that animates together.
 */
export const findActiveSlidesForCards = async (
  cardIds: string[],
  executor?: Executor,
): Promise<WmsProofSlide[]> => {
  if (cardIds.length === 0) return [];
  const result = await runQuery<SlideRow>(
    executor,
    `SELECT ${SLIDE_COLUMNS} FROM wms_proof_slides s
      WHERE s.card_id = ANY($1::uuid[]) AND s.status = 'ACTIVE'
      ORDER BY s.display_order ASC, s.created_at ASC`,
    [cardIds],
  );
  return result.rows.map(toSlide);
};

export const countSlides = async (cardId: string, executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM wms_proof_slides WHERE card_id = $1',
    [cardId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextSlideOrder = async (
  cardId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM wms_proof_slides WHERE card_id = $1`,
    [cardId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createSlide = async (
  cardId: string,
  input: CreateWmsProofSlideInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<WmsProofSlide> => {
  const result = await runQuery<SlideRow>(
    executor,
    `INSERT INTO wms_proof_slides
       (card_id, image_url, image_file_id, alt, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING ${SLIDE_RETURNING}`,
    [
      cardId,
      input.imageUrl,
      input.imageFileId,
      input.alt,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toSlide(result.rows[0]);
};

export const updateSlide = async (
  id: string,
  patch: UpdateWmsProofSlideInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WmsProofSlide | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(SLIDE_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  /*
   * Exactly one image source may be set, so naming one has to clear the other
   * in the same statement. Without this, patching imageUrl onto a slide that
   * already has an imageFileId violates the constraint instead of replacing
   * the artwork.
   */
  if (patch.imageUrl !== undefined) {
    assign('image_url', patch.imageUrl);
    if (patch.imageFileId === undefined) assign('image_file_id', null);
  }
  if (patch.imageFileId !== undefined) {
    assign('image_file_id', patch.imageFileId);
    if (patch.imageUrl === undefined) assign('image_url', null);
  }

  if (assignments.length === 0) return findSlideById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<SlideRow>(
    executor,
    `UPDATE wms_proof_slides SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${SLIDE_RETURNING}`,
    values,
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const updateSlideStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<WmsProofSlide | null> => {
  const result = await runQuery<SlideRow>(
    executor,
    `UPDATE wms_proof_slides SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${SLIDE_RETURNING}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toSlide(result.rows[0]) : null;
};

export const applySlideOrder = async (
  cardId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE wms_proof_slides AS s
        SET display_order = ordered.position, updated_by = $3
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE s.id = ordered.id AND s.card_id = $2`,
    [orderedIds, cardId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingSlideIds = async (
  cardId: string,
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM wms_proof_slides WHERE card_id = $1 AND id = ANY($2::uuid[])',
    [cardId, ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeSlide = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM wms_proof_slides WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
