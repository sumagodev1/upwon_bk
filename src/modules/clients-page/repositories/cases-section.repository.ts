// src/modules/clients-page/repositories/cases-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../core/utils/query-builder';
import {
  CaseSectionKey,
  ClientsCaseCard,
  ClientsCaseCardFilters,
  ClientsCaseOutcome,
  CreateClientsCaseCardInput,
  UpdateClientsCaseCardInput,
} from '../types/cases-section.types';

/**
 * One row per case study: the card and the story's text fields. The story's
 * lists live in child tables (repositories/story-rows.repository.ts); the only
 * one read back here is the ACTIVE outcomes, which the card shows.
 */

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  brand: 'c.brand',
  category: 'c.category',
  displayOrder: 'c.display_order',
  status: 'c.status',
  createdAt: 'c.created_at',
  updatedAt: 'c.updated_at',
} as const;

/** Columns an update may touch; updated_by comes from the request context. */
const UPDATABLE: Readonly<Record<string, string>> = {
  category: 'category',
  brand: 'brand',
  location: 'location',
  scale: 'scale',
  headline: 'headline',
  storyUrl: 'story_url',
  slug: 'slug',
  duration: 'duration',
  challengeOneLine: 'challenge_one_line',
  challengeSummary: 'challenge_summary',
  whyUpwon: 'why_upwon',
  testimonialQuote: 'testimonial_quote',
  testimonialAuthor: 'testimonial_author',
  testimonialRole: 'testimonial_role',
  displayOrder: 'display_order',
  status: 'status',
} as const;

/** Each story section's on/off column. */
export const SECTION_COLUMNS: Readonly<Record<CaseSectionKey, string>> = {
  outcomes: 'outcomes_status',
  challenges: 'challenges_status',
  whyUpwon: 'why_upwon_status',
  timeline: 'timeline_status',
  deliverables: 'deliverables_status',
  testimonial: 'testimonial_status',
} as const;

const COLUMNS = `
  c.id, c.category, c.brand, c.location, c.scale, c.headline, c.story_url,
  c.slug, c.duration, c.challenge_one_line, c.challenge_summary, c.why_upwon,
  c.testimonial_quote, c.testimonial_author, c.testimonial_role,
  c.outcomes_status, c.challenges_status, c.why_upwon_status,
  c.timeline_status, c.deliverables_status, c.testimonial_status,
  c.display_order, c.status, c.created_by, c.updated_by, c.created_at, c.updated_at,
  (SELECT COALESCE(
            json_agg(json_build_object('value', o.value, 'label', o.label)
                     ORDER BY o.display_order, o.created_at),
            '[]'::json)
     FROM clients_case_outcomes o
    WHERE o.case_id = c.id AND o.status = 'ACTIVE') AS outcomes
`;

interface CardRow {
  id: string;
  category: string;
  brand: string;
  location: string;
  scale: string | null;
  headline: string;
  story_url: string | null;
  slug: string | null;
  duration: string | null;
  challenge_one_line: string | null;
  challenge_summary: string | null;
  why_upwon: string | null;
  testimonial_quote: string | null;
  testimonial_author: string | null;
  testimonial_role: string | null;
  outcomes_status: ContentStatus;
  challenges_status: ContentStatus;
  why_upwon_status: ContentStatus;
  timeline_status: ContentStatus;
  deliverables_status: ContentStatus;
  testimonial_status: ContentStatus;
  outcomes: ClientsCaseOutcome[];
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCard = (row: CardRow): ClientsCaseCard => ({
  id: row.id,
  category: row.category,
  brand: row.brand,
  location: row.location,
  scale: row.scale,
  headline: row.headline,
  outcomes: Array.isArray(row.outcomes) ? row.outcomes : [],
  storyUrl: row.story_url,
  slug: row.slug,
  duration: row.duration,
  challengeOneLine: row.challenge_one_line,
  challengeSummary: row.challenge_summary,
  whyUpwon: row.why_upwon,
  testimonialQuote: row.testimonial_quote,
  testimonialAuthor: row.testimonial_author,
  testimonialRole: row.testimonial_role,
  sections: {
    outcomes: row.outcomes_status,
    challenges: row.challenges_status,
    whyUpwon: row.why_upwon_status,
    timeline: row.timeline_status,
    deliverables: row.deliverables_status,
    testimonial: row.testimonial_status,
  },
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
): Promise<ClientsCaseCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${COLUMNS} FROM clients_case_cards c WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ClientsCaseCard | null> => {
  // The lock is taken on the card alone; FOR UPDATE cannot sit on a query
  // whose select list aggregates another table.
  await runQuery(executor, 'SELECT id FROM clients_case_cards WHERE id = $1 FOR UPDATE', [id]);
  return findById(id, executor);
};

export const findAll = async (
  filters: ClientsCaseCardFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ClientsCaseCard>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, { column: 'c.status', operator: '=', value: filters.status });
  if (pagination.search) {
    const term = `%${pagination.search}%`;
    builder.raw(
      '(c.brand ILIKE ? OR c.category ILIKE ? OR c.location ILIKE ? OR c.headline ILIKE ?' +
        ' OR c.slug ILIKE ?)',
      term,
      term,
      term,
      term,
      term,
    );
  }

  // Display order is the default: the admin list should read like the grid.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM clients_case_cards c
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

/** Every ACTIVE card, in order, unpaginated - the cap keeps the set small. */
export const findPublished = async (executor?: Executor): Promise<ClientsCaseCard[]> => {
  const result = await runQuery<CardRow>(
    executor,
    `
    SELECT ${COLUMNS}
      FROM clients_case_cards c
     WHERE c.status = 'ACTIVE'
     ORDER BY c.display_order ASC, c.created_at ASC
    `,
    [],
  );
  return result.rows.map(toCard);
};

/** The public story read: an ACTIVE card with this slug. */
export const findPublishedBySlug = async (
  slug: string,
  executor?: Executor,
): Promise<ClientsCaseCard | null> => {
  const result = await runQuery<CardRow>(
    executor,
    `SELECT ${COLUMNS} FROM clients_case_cards c WHERE c.slug = $1 AND c.status = 'ACTIVE'`,
    [slug],
  );
  return result.rows[0] ? toCard(result.rows[0]) : null;
};

/** Whether another card already owns this slug - checked before a write. */
export const isSlugTaken = async (
  slug: string,
  exceptId: string | null,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM clients_case_cards WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2)',
    [slug, exceptId],
  );
  return result.rows.length > 0;
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM clients_case_cards',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end" default for a create with no displayOrder. */
export const nextOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM clients_case_cards',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const create = async (
  input: CreateClientsCaseCardInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ClientsCaseCard> => {
  const result = await runQuery<{ id: string }>(
    executor,
    `
    INSERT INTO clients_case_cards
      (category, brand, location, scale, headline, story_url,
       slug, duration, challenge_one_line, challenge_summary, why_upwon,
       testimonial_quote, testimonial_author, testimonial_role,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
    RETURNING id
    `,
    [
      input.category,
      input.brand,
      input.location,
      input.scale,
      input.headline,
      input.storyUrl,
      input.slug,
      input.duration,
      input.challengeOneLine,
      input.challengeSummary,
      input.whyUpwon,
      input.testimonialQuote,
      input.testimonialAuthor,
      input.testimonialRole,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  // Re-read so the derived outcomes and section statuses come back too.
  return (await findById(result.rows[0].id, executor)) as ClientsCaseCard;
};

export const update = async (
  id: string,
  patch: UpdateClientsCaseCardInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsCaseCard | null> => {
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

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery(
    executor,
    `UPDATE clients_case_cards SET ${assignments.join(', ')} WHERE id = $${values.length}`,
    values,
  );
  return (result.rowCount ?? 0) > 0 ? findById(id, executor) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsCaseCard | null> => {
  const result = await runQuery(
    executor,
    'UPDATE clients_case_cards SET status = $2, updated_by = $3 WHERE id = $1',
    [id, status, updatedBy],
  );
  return (result.rowCount ?? 0) > 0 ? findById(id, executor) : null;
};

/** Switches one story section on or off. */
export const updateSectionStatus = async (
  id: string,
  section: CaseSectionKey,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ClientsCaseCard | null> => {
  // SECTION_COLUMNS is a closed map, so the interpolated column is never input.
  const result = await runQuery(
    executor,
    `UPDATE clients_case_cards SET ${SECTION_COLUMNS[section]} = $2, updated_by = $3 WHERE id = $1`,
    [id, status, updatedBy],
  );
  return (result.rowCount ?? 0) > 0 ? findById(id, executor) : null;
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
    UPDATE clients_case_cards AS c
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE c.id = ordered.id
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
    'SELECT id FROM clients_case_cards WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** A hard delete; its story rows go with it (ON DELETE CASCADE). */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM clients_case_cards WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
