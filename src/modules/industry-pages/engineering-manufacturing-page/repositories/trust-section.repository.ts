// src/modules/industry-pages/engineering-manufacturing-page/repositories/trust-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { EngineeringIconName } from '../utils/icons';
import {
  CreateEngineeringTrustLogoInput,
  CreateEngineeringTrustCardInput,
  EngineeringTrustLogo,
  EngineeringTrustLogoFilters,
  EngineeringTrustCard,
  EngineeringTrustCardFilters,
  UpdateEngineeringTrustLogoInput,
  UpdateEngineeringTrustCardInput,
} from '../types/trust-section.types';

/**
 * Two tables behind one section: the logo marquee and the figure cards.
 *
 * Grouped in one file rather than two because they are read together - the
 * published section is a single query fan-out - and neither is big enough to be
 * worth opening on its own.
 */

// ── the logo marquee ──────────────────────────────────────────────────────

const LOGO_SORT_COLUMNS: Readonly<Record<string, string>> = {
  alt: 'l.alt',
  displayOrder: 'l.display_order',
  status: 'l.status',
  createdAt: 'l.created_at',
  updatedAt: 'l.updated_at',
} as const;

const LOGO_UPDATABLE: Readonly<Record<string, string>> = {
  imageUrl: 'image_url',
  imageFileId: 'image_file_id',
  alt: 'alt',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const LOGO_COLUMNS = `
  l.id, l.image_url, l.image_file_id, l.alt, l.display_order, l.status,
  l.created_by, l.updated_by, l.created_at, l.updated_at
`;

const LOGO_RETURNING = `
  id, image_url, image_file_id, alt, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface LogoRow {
  id: string;
  image_url: string | null;
  image_file_id: string | null;
  alt: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toLogo = (row: LogoRow): EngineeringTrustLogo => ({
  id: row.id,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  alt: row.alt,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findLogoById = async (
  id: string,
  executor?: Executor,
): Promise<EngineeringTrustLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM engineering_trust_logos l WHERE l.id = $1`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findLogoByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<EngineeringTrustLogo | null> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM engineering_trust_logos l WHERE l.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const findAllLogos = async (
  filters: EngineeringTrustLogoFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<EngineeringTrustLogo>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'l.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw('l.alt ILIKE ?', `%${pagination.search}%`);
  }

  // Display order is the default: the admin list should read like the marquee,
  // which starts from its left edge.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, LOGO_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${LOGO_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM engineering_trust_logos l
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

export const findPublishedLogos = async (executor?: Executor): Promise<EngineeringTrustLogo[]> => {
  const result = await runQuery<LogoRow>(
    executor,
    `SELECT ${LOGO_COLUMNS} FROM engineering_trust_logos l
      WHERE l.status = 'ACTIVE'
      ORDER BY l.display_order ASC, l.created_at ASC`,
    [],
  );
  return result.rows.map(toLogo);
};

export const countLogos = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM engineering_trust_logos',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextLogoOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM engineering_trust_logos',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createLogo = async (
  input: CreateEngineeringTrustLogoInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<EngineeringTrustLogo> => {
  const result = await runQuery<LogoRow>(
    executor,
    `INSERT INTO engineering_trust_logos
       (image_url, image_file_id, alt, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${LOGO_RETURNING}`,
    [
      input.imageUrl,
      input.imageFileId,
      input.alt,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toLogo(result.rows[0]);
};

/**
 * Setting one image source clears the other.
 *
 * Without this, swapping an uploaded mark for a hosted URL would leave both
 * columns populated and trip the table's exclusivity check - so the edit that
 * looks obvious in the form would fail on save.
 */
export const updateLogo = async (
  id: string,
  patch: UpdateEngineeringTrustLogoInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<EngineeringTrustLogo | null> => {
  const effective: Record<string, unknown> = { ...patch };
  if (patch.imageUrl !== undefined && patch.imageUrl !== null) effective.imageFileId = null;
  if (patch.imageFileId !== undefined && patch.imageFileId !== null) effective.imageUrl = null;

  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(LOGO_UPDATABLE)) {
    const value = effective[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findLogoById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<LogoRow>(
    executor,
    `UPDATE engineering_trust_logos SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${LOGO_RETURNING}`,
    values,
  );
  return result.rows[0] ? toLogo(result.rows[0]) : null;
};

export const applyLogoOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE engineering_trust_logos AS l
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE l.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingLogoIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM engineering_trust_logos WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeLogo = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM engineering_trust_logos WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── the figure cards ──────────────────────────────────────────────────────

const CARD_SORT_COLUMNS: Readonly<Record<string, string>> = {
  label: 'c.label',
  value: 'c.value',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/**
 * Columns an update may touch directly. The second figure is absent because
 * it is written as a pair, and updated_by because it comes from the request
 * context rather than the body.
 */
const CARD_UPDATABLE: Readonly<Record<string, string>> = {
  icon: 'icon',
  accentColor: 'accent_color',
  tintColor: 'tint_color',
  value: 'value',
  label: 'label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const CARD_COLUMNS = `
  c.id, c.icon, c.accent_color, c.tint_color, c.value, c.label,
  c.alt_value, c.alt_label, c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const CARD_RETURNING = `
  id, icon, accent_color, tint_color, value, label,
  alt_value, alt_label, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CardRow {
  id: string;
  icon: string;
  accent_color: string;
  tint_color: string;
  value: string;
  label: string;
  alt_value: string | null;
  alt_label: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCard = (row: CardRow): EngineeringTrustCard => ({
  id: row.id,
  icon: row.icon as EngineeringIconName,
  accentColor: row.accent_color,
  tintColor: row.tint_color,
  value: row.value,
  label: row.label,
  // The pair check keeps both halves together, so one non-null half is enough.
  alternate:
    row.alt_value && row.alt_label ? { value: row.alt_value, label: row.alt_label } : null,
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
): Promise<EngineeringTrustCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM engineering_trust_cards c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findCardByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<EngineeringTrustCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM engineering_trust_cards c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findAllCards = async (
  filters: EngineeringTrustCardFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<EngineeringTrustCard>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(c.label ILIKE ? OR c.value ILIKE ? OR c.alt_label ILIKE ? OR c.alt_value ILIKE ?)',
      ...Array.from({ length: 4 }, () => `%${pagination.search}%`),
    );
  }

  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, CARD_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${CARD_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM engineering_trust_cards c
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

export const findPublishedCards = async (
  executor?: Executor,
): Promise<EngineeringTrustCard[]> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM engineering_trust_cards c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCard);
};

export const countCards = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM engineering_trust_cards',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextCardOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM engineering_trust_cards',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createCard = async (
  input: CreateEngineeringTrustCardInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<EngineeringTrustCard> => {
  const result = await runQuery<CardRow>(
    executor,
    `INSERT INTO engineering_trust_cards
       (icon, accent_color, tint_color, value, label, alt_value, alt_label,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING ${CARD_RETURNING}`,
    [
      input.icon,
      input.accentColor,
      input.tintColor,
      input.value,
      input.label,
      input.alternate?.value ?? null,
      input.alternate?.label ?? null,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toCard(result.rows[0]);
};

export const updateCard = async (
  id: string,
  patch: UpdateEngineeringTrustCardInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<EngineeringTrustCard | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(CARD_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  // Written as a pair, so a cleared figure nulls both columns.
  if (patch.alternate !== undefined) {
    assign('alt_value', patch.alternate?.value ?? null);
    assign('alt_label', patch.alternate?.label ?? null);
  }

  if (assignments.length === 0) return findCardById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<CardRow>(
    executor,
    `UPDATE engineering_trust_cards SET ${assignments.join(', ')}
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
    `UPDATE engineering_trust_cards AS c
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
    'SELECT id FROM engineering_trust_cards WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeCard = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM engineering_trust_cards WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
