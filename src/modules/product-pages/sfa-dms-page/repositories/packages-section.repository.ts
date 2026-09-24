// src/modules/product-pages/sfa-dms-page/repositories/packages-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { SfaIconName } from '../utils/icons';
import {
  CreateSfaPackageCardInput,
  CreateSfaPackageFeatureInput,
  SfaPackageCard,
  SfaPackageCardFilters,
  SfaPackageFeature,
  SfaPackageFeatureFilters,
  UpdateSfaPackageCardInput,
  UpdateSfaPackageFeatureInput,
} from '../types/packages-section.types';

/**
 * Two tables: the cards and their ticks.
 *
 * Every feature query is scoped by its card id as well as its own, so a
 * feature belonging to one card can never be read or written through another
 * card's URL.
 */

// ── the cards ─────────────────────────────────────────────────────────────

const CARD_SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'c.title',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

const CARD_UPDATABLE: Readonly<Record<string, string>> = {
  icon: 'icon',
  stageLabel: 'stage_label',
  title: 'title',
  subtitle: 'subtitle',
  description: 'description',
  accentColor: 'accent_color',
  buttonLabel: 'button_label',
  buttonHref: 'button_href',
  featuresLabel: 'features_label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const CARD_COLUMNS = `
  c.id, c.icon, c.stage_label, c.title, c.subtitle, c.description,
  c.accent_color, c.button_label, c.button_href, c.features_label,
  c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const CARD_RETURNING = `
  id, icon, stage_label, title, subtitle, description,
  accent_color, button_label, button_href, features_label,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CardRow {
  id: string;
  icon: string;
  stage_label: string;
  title: string;
  subtitle: string;
  description: string;
  accent_color: string;
  button_label: string;
  button_href: string;
  features_label: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCard = (row: CardRow): SfaPackageCard => ({
  id: row.id,
  icon: row.icon as SfaIconName,
  stageLabel: row.stage_label,
  title: row.title,
  subtitle: row.subtitle,
  description: row.description,
  accentColor: row.accent_color,
  buttonLabel: row.button_label,
  buttonHref: row.button_href,
  featuresLabel: row.features_label,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCardById = async (
  id: string,
  executor?: Executor,
): Promise<SfaPackageCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM sfa_package_cards c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findCardByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<SfaPackageCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM sfa_package_cards c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findAllCards = async (
  filters: SfaPackageCardFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<SfaPackageCard>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(c.title ILIKE ? OR c.subtitle ILIKE ? OR c.stage_label ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the row of
  // cards, which is the order the stages are meant to be taken in.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, CARD_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${CARD_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM sfa_package_cards c
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

export const findPublishedCards = async (executor?: Executor): Promise<SfaPackageCard[]> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM sfa_package_cards c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCard);
};

export const countCards = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM sfa_package_cards',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextCardOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM sfa_package_cards',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createCard = async (
  input: CreateSfaPackageCardInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<SfaPackageCard> => {
  const result = await runQuery<CardRow>(
    executor,
    `INSERT INTO sfa_package_cards
       (icon, stage_label, title, subtitle, description, accent_color,
        button_label, button_href, features_label, display_order, status,
        created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
     RETURNING ${CARD_RETURNING}`,
    [
      input.icon,
      input.stageLabel,
      input.title,
      input.subtitle,
      input.description,
      input.accentColor,
      input.buttonLabel,
      input.buttonHref,
      input.featuresLabel,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toCard(result.rows[0]);
};

export const updateCard = async (
  id: string,
  patch: UpdateSfaPackageCardInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<SfaPackageCard | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(CARD_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findCardById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<CardRow>(
    executor,
    `UPDATE sfa_package_cards SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${CARD_RETURNING}`,
    values,
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
    `UPDATE sfa_package_cards AS c
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
    'SELECT id FROM sfa_package_cards WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeCard = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM sfa_package_cards WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── the ticks ─────────────────────────────────────────────────────────────

const FEATURE_SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'f.label',
  displayOrder: 'f.display_order',
  status: 'f.status',
  createdAt: 'f.created_at',
  updatedAt: 'f.updated_at',
} as const;

const FEATURE_UPDATABLE: Readonly<Record<string, string>> = {
  label: 'label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const FEATURE_COLUMNS = `
  f.id, f.card_id, f.label, f.display_order, f.status,
  f.created_by, f.updated_by, f.created_at, f.updated_at
`;

const FEATURE_RETURNING = `
  id, card_id, label, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface FeatureRow {
  id: string;
  card_id: string;
  label: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toFeature = (row: FeatureRow): SfaPackageFeature => ({
  id: row.id,
  cardId: row.card_id,
  label: row.label,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Scoped by card as well as by id.
 *
 * Without the card in the WHERE clause, /cards/<A>/features/<id> would happily
 * resolve a feature belonging to card B - the id alone is enough to find the
 * row, and the URL's card would be decoration.
 */
export const findFeatureById = async (
  cardId: string,
  id: string,
  executor?: Executor,
): Promise<SfaPackageFeature | null> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM sfa_package_features f
      WHERE f.id = $1 AND f.card_id = $2`,
    [id, cardId],
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

export const findFeatureByIdForUpdate = async (
  cardId: string,
  id: string,
  executor: Executor,
): Promise<SfaPackageFeature | null> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM sfa_package_features f
      WHERE f.id = $1 AND f.card_id = $2 FOR UPDATE`,
    [id, cardId],
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

export const findAllFeatures = async (
  cardId: string,
  filters: SfaPackageFeatureFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<SfaPackageFeature>> => {
  const builder = new SqlBuilder();
  builder.raw('f.card_id = ?', cardId);
  builder.whereIf(filters.status, {
    column: 'f.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw('f.label ILIKE ?', `%${pagination.search}%`);
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, FEATURE_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${FEATURE_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM sfa_package_features f
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, f.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<FeatureRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toFeature),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/** Every live tick for every live card, in one query - the public read path. */
export const findPublishedFeatures = async (
  executor?: Executor,
): Promise<SfaPackageFeature[]> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `SELECT ${FEATURE_COLUMNS} FROM sfa_package_features f
      WHERE f.status = 'ACTIVE'
      ORDER BY f.display_order ASC, f.created_at ASC`,
    [],
  );
  return result.rows.map(toFeature);
};

export const countFeatures = async (
  cardId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM sfa_package_features WHERE card_id = $1',
    [cardId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextFeatureOrder = async (
  cardId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM sfa_package_features WHERE card_id = $1`,
    [cardId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createFeature = async (
  cardId: string,
  input: CreateSfaPackageFeatureInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<SfaPackageFeature> => {
  const result = await runQuery<FeatureRow>(
    executor,
    `INSERT INTO sfa_package_features
       (card_id, label, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${FEATURE_RETURNING}`,
    [cardId, input.label, input.displayOrder, input.status, createdBy],
  );
  return toFeature(result.rows[0]);
};

export const updateFeature = async (
  cardId: string,
  id: string,
  patch: UpdateSfaPackageFeatureInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<SfaPackageFeature | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(FEATURE_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findFeatureById(cardId, id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);
  values.push(cardId);

  const result = await runQuery<FeatureRow>(
    executor,
    `UPDATE sfa_package_features SET ${assignments.join(', ')}
      WHERE id = $${values.length - 1} AND card_id = $${values.length}
     RETURNING ${FEATURE_RETURNING}`,
    values,
  );
  return result.rows[0] ? toFeature(result.rows[0]) : null;
};

export const applyFeatureOrder = async (
  cardId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE sfa_package_features AS f
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE f.id = ordered.id AND f.card_id = $3`,
    [orderedIds, updatedBy, cardId],
  );
  return result.rowCount ?? 0;
};

export const findExistingFeatureIds = async (
  cardId: string,
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    `SELECT id FROM sfa_package_features
      WHERE id = ANY($1::uuid[]) AND card_id = $2`,
    [ids, cardId],
  );
  return result.rows.map((row) => row.id);
};

export const removeFeature = async (
  cardId: string,
  id: string,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM sfa_package_features WHERE id = $1 AND card_id = $2',
    [id, cardId],
  );
  return (result.rowCount ?? 0) > 0;
};
