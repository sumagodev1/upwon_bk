// src/modules/product-pages/sfa-dms-page/repositories/outcomes-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateSfaOutcomeCardInput,
  SfaOutcomeCard,
  SfaOutcomeCardFilters,
  SfaOutcomeSection,
  UpdateSfaOutcomeCardInput,
  UpsertSfaOutcomeSectionInput,
} from '../types/outcomes-section.types';

/** Two tables: the pair of buttons, and the story cards. */

// ── the two buttons ───────────────────────────────────────────────────────

const SECTION_COLUMNS = `
  id, primary_label, primary_href, secondary_label, secondary_href,
  created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): SfaOutcomeSection => ({
  id: row.id,
  primaryLabel: row.primary_label,
  primaryHref: row.primary_href,
  secondaryLabel: row.secondary_label,
  secondaryHref: row.secondary_href,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findSection = async (
  executor?: Executor,
): Promise<SfaOutcomeSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${SECTION_COLUMNS} FROM sfa_outcome_section LIMIT 1`,
    [],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Creates the buttons or replaces them.
 *
 * ON CONFLICT on `singleton`, which can only ever be TRUE - so the first save
 * creates the row and every later save replaces it, and an administrator never
 * has to create the record before editing it.
 */
export const upsertSection = async (
  input: UpsertSfaOutcomeSectionInput,
  adminId: string | null,
  executor?: Executor,
): Promise<SfaOutcomeSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO sfa_outcome_section
       (singleton, primary_label, primary_href, secondary_label, secondary_href,
        created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $5)
     ON CONFLICT (singleton) DO UPDATE
        SET primary_label = EXCLUDED.primary_label,
            primary_href = EXCLUDED.primary_href,
            secondary_label = EXCLUDED.secondary_label,
            secondary_href = EXCLUDED.secondary_href,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${SECTION_COLUMNS}`,
    [
      input.primaryLabel,
      input.primaryHref,
      input.secondaryLabel,
      input.secondaryHref,
      adminId,
    ],
  );
  return toSection(result.rows[0]);
};

// ── the story cards ───────────────────────────────────────────────────────

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  title: 'c.title',
  personName: 'c.person_name',
  company: 'c.company',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

const UPDATABLE: Readonly<Record<string, string>> = {
  title: 'title',
  body: 'body',
  personName: 'person_name',
  personRole: 'person_role',
  company: 'company',
  photoUrl: 'photo_url',
  photoFileId: 'photo_file_id',
  linkHref: 'link_href',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const CARD_COLUMNS = `
  c.id, c.title, c.body, c.person_name, c.person_role, c.company,
  c.photo_url, c.photo_file_id, c.link_href, c.display_order, c.status,
  c.created_by, c.updated_by, c.created_at, c.updated_at
`;

const CARD_RETURNING = `
  id, title, body, person_name, person_role, company,
  photo_url, photo_file_id, link_href, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface CardRow {
  id: string;
  title: string;
  body: string;
  person_name: string;
  person_role: string;
  company: string;
  photo_url: string | null;
  photo_file_id: string | null;
  link_href: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCard = (row: CardRow): SfaOutcomeCard => ({
  id: row.id,
  title: row.title,
  body: row.body,
  personName: row.person_name,
  personRole: row.person_role,
  company: row.company,
  photoUrl: row.photo_url,
  photoFileId: row.photo_file_id,
  linkHref: row.link_href,
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
): Promise<SfaOutcomeCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM sfa_outcome_cards c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findCardByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<SfaOutcomeCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM sfa_outcome_cards c WHERE c.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

export const findAllCards = async (
  filters: SfaOutcomeCardFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<SfaOutcomeCard>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'c.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(c.title ILIKE ? OR c.person_name ILIKE ? OR c.company ILIKE ?)',
      ...Array.from({ length: 3 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the carousel.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${CARD_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM sfa_outcome_cards c
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

export const findPublishedCards = async (executor?: Executor): Promise<SfaOutcomeCard[]> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${CARD_COLUMNS} FROM sfa_outcome_cards c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.display_order ASC, c.created_at ASC`,
    [],
  );
  return result.rows.map(toCard);
};

export const countCards = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM sfa_outcome_cards',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextCardOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM sfa_outcome_cards',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createCard = async (
  input: CreateSfaOutcomeCardInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<SfaOutcomeCard> => {
  const result = await runQuery<CardRow>(
    executor,
    `INSERT INTO sfa_outcome_cards
       (title, body, person_name, person_role, company,
        photo_url, photo_file_id, link_href, display_order, status,
        created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
     RETURNING ${CARD_RETURNING}`,
    [
      input.title,
      input.body,
      input.personName,
      input.personRole,
      input.company,
      input.photoUrl,
      input.photoFileId,
      input.linkHref,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toCard(result.rows[0]);
};

/**
 * Setting one photo source clears the other.
 *
 * Without this, uploading a replacement for a card that currently holds a URL
 * would leave both columns populated and trip the table's exclusivity check -
 * so the edit that looks obvious in the form would fail on save.
 */
export const updateCard = async (
  id: string,
  patch: UpdateSfaOutcomeCardInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<SfaOutcomeCard | null> => {
  const effective: Record<string, unknown> = { ...patch };
  if (patch.photoUrl !== undefined && patch.photoUrl !== null) effective.photoFileId = null;
  if (patch.photoFileId !== undefined && patch.photoFileId !== null) effective.photoUrl = null;

  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE)) {
    const value = effective[key];
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
    `UPDATE sfa_outcome_cards SET ${assignments.join(', ')}
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
    `UPDATE sfa_outcome_cards AS c
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
    'SELECT id FROM sfa_outcome_cards WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeCard = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM sfa_outcome_cards WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
