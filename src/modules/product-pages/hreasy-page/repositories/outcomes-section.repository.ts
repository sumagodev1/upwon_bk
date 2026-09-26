// src/modules/product-pages/hreasy-page/repositories/outcomes-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import {
  CreateHreasyOutcomeStatInput,
  CreateHreasyOutcomeStoryInput,
  HreasyOutcomeStat,
  HreasyOutcomeStory,
  HreasyOutcomeStoryFilters,
  UpdateHreasyOutcomeStatInput,
  UpdateHreasyOutcomeStoryInput,
} from '../types/outcomes-section.types';

/**
 * Two tables: the story cards and the small figures on them. The figures are
 * read in bulk by story id rather than one query per card, so assembling the
 * whole row is two round trips.
 */

// ── the story cards ───────────────────────────────────────────────────────

const SORT_COLUMNS: Readonly<Record<string, string>> = {
  name: 's.name',
  slug: 's.slug',
  displayOrder: 's.display_order',
  status: 's.status',
  createdAt: 's.created_at',
  updatedAt: 's.updated_at',
} as const;

/**
 * Columns an update may touch directly. The logo pair is absent because it
 * needs the "setting one clears the other" handling, and updated_by is absent
 * because it comes from the request context rather than the body.
 */
const STORY_UPDATABLE: Readonly<Record<string, string>> = {
  name: 'name',
  slug: 'slug',
  tag: 'tag',
  heroValue: 'hero_value',
  heroLabel: 'hero_label',
  body: 'body',
  linkLabel: 'link_label',
  linkHref: 'link_href',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const STORY_COLUMNS = `
  s.id, s.name, s.slug, s.logo_url, s.logo_file_id, s.tag,
  s.hero_value, s.hero_label, s.body, s.link_label, s.link_href,
  s.display_order, s.status,
  s.created_by, s.updated_by, s.created_at, s.updated_at
`;

const STORY_RETURNING = `
  id, name, slug, logo_url, logo_file_id, tag,
  hero_value, hero_label, body, link_label, link_href,
  display_order, status, created_by, updated_by, created_at, updated_at
`;

interface StoryRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  logo_file_id: string | null;
  tag: string;
  hero_value: string;
  hero_label: string;
  body: string;
  link_label: string;
  link_href: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toStory = (row: StoryRow): HreasyOutcomeStory => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  logoUrl: row.logo_url,
  logoFileId: row.logo_file_id,
  tag: row.tag,
  heroValue: row.hero_value,
  heroLabel: row.hero_label,
  body: row.body,
  linkLabel: row.link_label,
  linkHref: row.link_href,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findStoryById = async (
  id: string,
  executor?: Executor,
): Promise<HreasyOutcomeStory | null> => {
  const result = await runQuery<StoryRow>(
    executor,
    `SELECT ${STORY_COLUMNS} FROM hreasy_outcome_stories s WHERE s.id = $1`,
    [id],
  );
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

/** Read-then-write paths take the row lock, so a concurrent update serialises. */
export const findStoryByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<HreasyOutcomeStory | null> => {
  const result = await runQuery<StoryRow>(
    executor,
    `SELECT ${STORY_COLUMNS} FROM hreasy_outcome_stories s WHERE s.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

/** Lets the service report a duplicate slug as a field error, not a 409. */
export const findStoryBySlug = async (
  slug: string,
  executor?: Executor,
): Promise<HreasyOutcomeStory | null> => {
  const result = await runQuery<StoryRow>(
    executor,
    `SELECT ${STORY_COLUMNS} FROM hreasy_outcome_stories s WHERE s.slug = $1`,
    [slug],
  );
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

export const findAllStories = async (
  filters: HreasyOutcomeStoryFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<HreasyOutcomeStory>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 's.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      '(s.name ILIKE ? OR s.slug ILIKE ? OR s.tag ILIKE ? OR s.hero_label ILIKE ? OR s.body ILIKE ?)',
      ...Array.from({ length: 5 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the row.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${STORY_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM hreasy_outcome_stories s
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, s.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<StoryRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toStory),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

/**
 * created_at is the tiebreaker rather than id, so two rows sharing a
 * display_order keep a stable, authoring-order sequence on the live site.
 */
export const findPublishedStories = async (
  executor?: Executor,
): Promise<HreasyOutcomeStory[]> => {
  const result = await runQuery<StoryRow>(
    executor,
    `SELECT ${STORY_COLUMNS} FROM hreasy_outcome_stories s
      WHERE s.status = 'ACTIVE'
      ORDER BY s.display_order ASC, s.created_at ASC`,
    [],
  );
  return result.rows.map(toStory);
};

export const countStories = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM hreasy_outcome_stories',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextStoryOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM hreasy_outcome_stories',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createStory = async (
  input: CreateHreasyOutcomeStoryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<HreasyOutcomeStory> => {
  const result = await runQuery<StoryRow>(
    executor,
    `INSERT INTO hreasy_outcome_stories
       (name, slug, logo_url, logo_file_id, tag,
        hero_value, hero_label, body, link_label, link_href,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
     RETURNING ${STORY_RETURNING}`,
    [
      input.name,
      input.slug,
      input.logoUrl,
      input.logoFileId,
      input.tag,
      input.heroValue,
      input.heroLabel,
      input.body,
      input.linkLabel,
      input.linkHref,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toStory(result.rows[0]);
};

export const updateStory = async (
  id: string,
  patch: UpdateHreasyOutcomeStoryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyOutcomeStory | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(STORY_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  /*
   * At most one logo source, so naming one has to clear the other in the same
   * statement. Without this, patching logoUrl onto a story that already has a
   * logoFileId violates the constraint instead of replacing the mark.
   */
  if (patch.logoUrl !== undefined) {
    assign('logo_url', patch.logoUrl);
    if (patch.logoUrl !== null && patch.logoFileId === undefined) assign('logo_file_id', null);
  }
  if (patch.logoFileId !== undefined) {
    assign('logo_file_id', patch.logoFileId);
    if (patch.logoFileId !== null && patch.logoUrl === undefined) assign('logo_url', null);
  }

  if (assignments.length === 0) return findStoryById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<StoryRow>(
    executor,
    `UPDATE hreasy_outcome_stories SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${STORY_RETURNING}`,
    values,
  );
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

export const updateStoryStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyOutcomeStory | null> => {
  const result = await runQuery<StoryRow>(
    executor,
    `UPDATE hreasy_outcome_stories SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${STORY_RETURNING}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

export const applyStoryOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE hreasy_outcome_stories AS s
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE s.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingStoryIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM hreasy_outcome_stories WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** The figures go with it - hreasy_outcome_stats cascades on delete. */
export const removeStory = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM hreasy_outcome_stories WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};

// ── the figures ───────────────────────────────────────────────────────────

const STAT_UPDATABLE: Readonly<Record<string, string>> = {
  value: 'value',
  label: 'label',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const STAT_COLUMNS = `
  t.id, t.story_id, t.value, t.label, t.display_order, t.status,
  t.created_by, t.updated_by, t.created_at, t.updated_at
`;

const STAT_RETURNING = `
  id, story_id, value, label, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface StatRow {
  id: string;
  story_id: string;
  value: string;
  label: string;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toStat = (row: StatRow): HreasyOutcomeStat => ({
  id: row.id,
  storyId: row.story_id,
  value: row.value,
  label: row.label,
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findStatById = async (
  id: string,
  executor?: Executor,
): Promise<HreasyOutcomeStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM hreasy_outcome_stats t WHERE t.id = $1`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const findStatByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<HreasyOutcomeStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM hreasy_outcome_stats t WHERE t.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

/** One story's figures, every status, in order. */
export const findStatsByStory = async (
  storyId: string,
  executor?: Executor,
): Promise<HreasyOutcomeStat[]> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM hreasy_outcome_stats t
      WHERE t.story_id = $1
      ORDER BY t.display_order ASC, t.created_at ASC`,
    [storyId],
  );
  return result.rows.map(toStat);
};

/**
 * Every active figure for the given stories, in one query.
 *
 * Assembling the row otherwise means a query per card - one round trip per
 * card for content that renders together.
 */
export const findActiveStatsForStories = async (
  storyIds: string[],
  executor?: Executor,
): Promise<HreasyOutcomeStat[]> => {
  if (storyIds.length === 0) return [];
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM hreasy_outcome_stats t
      WHERE t.story_id = ANY($1::uuid[]) AND t.status = 'ACTIVE'
      ORDER BY t.display_order ASC, t.created_at ASC`,
    [storyIds],
  );
  return result.rows.map(toStat);
};

export const countStats = async (storyId: string, executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM hreasy_outcome_stats WHERE story_id = $1',
    [storyId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextStatOrder = async (
  storyId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM hreasy_outcome_stats WHERE story_id = $1`,
    [storyId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createStat = async (
  storyId: string,
  input: CreateHreasyOutcomeStatInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<HreasyOutcomeStat> => {
  const result = await runQuery<StatRow>(
    executor,
    `INSERT INTO hreasy_outcome_stats
       (story_id, value, label, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${STAT_RETURNING}`,
    [storyId, input.value, input.label, input.displayOrder, input.status, createdBy],
  );
  return toStat(result.rows[0]);
};

export const updateStat = async (
  id: string,
  patch: UpdateHreasyOutcomeStatInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyOutcomeStat | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(STAT_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  if (assignments.length === 0) return findStatById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<StatRow>(
    executor,
    `UPDATE hreasy_outcome_stats SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${STAT_RETURNING}`,
    values,
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const updateStatStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<HreasyOutcomeStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `UPDATE hreasy_outcome_stats SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${STAT_RETURNING}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const applyStatOrder = async (
  storyId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE hreasy_outcome_stats AS t
        SET display_order = ordered.position, updated_by = $3
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE t.id = ordered.id AND t.story_id = $2`,
    [orderedIds, storyId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingStatIds = async (
  storyId: string,
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM hreasy_outcome_stats WHERE story_id = $1 AND id = ANY($2::uuid[])',
    [storyId, ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeStat = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM hreasy_outcome_stats WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
