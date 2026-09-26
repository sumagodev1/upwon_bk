// src/modules/insider-page/repositories/stories.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import {
  CreateInsiderStoryInput,
  InsiderStory,
  UpdateInsiderStoryInput,
} from '../types/issues.types';

/*
 * Every read and write here is scoped by issue_id as well as the story id. A
 * story is addressed as /issues/:issueId/stories/:storyId, and scoping the SQL
 * is what makes a story id under the wrong issue a 404 rather than a quiet
 * edit of some other issue's story.
 */

/**
 * Columns an update may touch. The image pair is absent because it needs the
 * "setting one clears the other" handling, and body because it needs a jsonb
 * cast - both are handled explicitly in update().
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  slug: 'slug',
  eyebrow: 'eyebrow',
  ctaLabel: 'cta_label',
  title: 'title',
  blurb: 'blurb',
  imageAlt: 'image_alt',
  readTime: 'read_time',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  st.id, st.issue_id, st.slug, st.eyebrow, st.cta_label, st.title, st.blurb,
  st.image_url, st.image_file_id, st.image_alt, st.read_time, st.body,
  st.display_order, st.status,
  st.created_by, st.updated_by, st.created_at, st.updated_at
`;

const RETURNING_COLUMNS = `
  id, issue_id, slug, eyebrow, cta_label, title, blurb,
  image_url, image_file_id, image_alt, read_time, body,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

/** created_at breaks display_order ties, so the grid order is stable. */
const STORY_ORDER = 'ORDER BY st.display_order ASC, st.created_at ASC';

interface InsiderStoryRow {
  id: string;
  issue_id: string;
  slug: string;
  eyebrow: string;
  cta_label: string;
  title: string;
  blurb: string;
  image_url: string | null;
  image_file_id: string | null;
  image_alt: string | null;
  read_time: string | null;
  /** pg parses jsonb, so this arrives as the array it was stored as. */
  body: unknown;
  display_order: number;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * The CHECK constraint guarantees an array; this guarantees an array of
 * strings, so a hand-edited row cannot put a non-string paragraph in front of
 * the renderer.
 */
const toParagraphs = (body: unknown): string[] =>
  Array.isArray(body) ? body.filter((entry): entry is string => typeof entry === 'string') : [];

const toStory = (row: InsiderStoryRow): InsiderStory => ({
  id: row.id,
  issueId: row.issue_id,
  slug: row.slug,
  eyebrow: row.eyebrow,
  ctaLabel: row.cta_label,
  title: row.title,
  blurb: row.blurb,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  imageAlt: row.image_alt,
  readTime: row.read_time,
  body: toParagraphs(row.body),
  displayOrder: row.display_order,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── reads ─────────────────────────────────────────────────────────────────

/** An issue's stories, every status, in grid order - the admin view. */
export const findByIssue = async (
  issueId: string,
  executor?: Executor,
): Promise<InsiderStory[]> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM insider_stories st
     WHERE st.issue_id = $1
    ${STORY_ORDER}
  `;
  const result = await runQuery<InsiderStoryRow>(executor, sql, [issueId]);
  return result.rows.map(toStory);
};

/**
 * ACTIVE stories for a set of issues in one query, in grid order - the public
 * archive read, which would otherwise be one query per issue.
 */
export const findPublishedByIssues = async (
  issueIds: string[],
  executor?: Executor,
): Promise<InsiderStory[]> => {
  if (issueIds.length === 0) return [];
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM insider_stories st
     WHERE st.issue_id = ANY($1::uuid[]) AND st.status = 'ACTIVE'
    ${STORY_ORDER}
  `;
  const result = await runQuery<InsiderStoryRow>(executor, sql, [issueIds]);
  return result.rows.map(toStory);
};

export const findById = async (
  issueId: string,
  storyId: string,
  executor?: Executor,
): Promise<InsiderStory | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM insider_stories st
     WHERE st.id = $1 AND st.issue_id = $2
  `;
  const result = await runQuery<InsiderStoryRow>(executor, sql, [storyId, issueId]);
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

export const findByIdForUpdate = async (
  issueId: string,
  storyId: string,
  executor: Executor,
): Promise<InsiderStory | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM insider_stories st
     WHERE st.id = $1 AND st.issue_id = $2
       FOR UPDATE
  `;
  const result = await runQuery<InsiderStoryRow>(executor, sql, [storyId, issueId]);
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

export const findPublishedBySlug = async (
  issueId: string,
  slug: string,
  executor?: Executor,
): Promise<InsiderStory | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM insider_stories st
     WHERE st.issue_id = $1 AND st.slug = $2 AND st.status = 'ACTIVE'
  `;
  const result = await runQuery<InsiderStoryRow>(executor, sql, [issueId, slug]);
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

export const countByIssue = async (issueId: string, executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM insider_stories WHERE issue_id = $1',
    [issueId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end of the issue" default. */
export const nextDisplayOrder = async (issueId: string, executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM insider_stories WHERE issue_id = $1',
    [issueId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

/** Returns the ids that exist in this issue, so a reorder can reject the rest. */
export const findExistingIds = async (
  issueId: string,
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM insider_stories WHERE issue_id = $1 AND id = ANY($2::uuid[])',
    [issueId, ids],
  );
  return result.rows.map((row) => row.id);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  issueId: string,
  input: CreateInsiderStoryInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<InsiderStory> => {
  // body is serialised explicitly: handed a JS array, pg would encode it as a
  // Postgres array literal, which is not valid jsonb.
  const sql = `
    INSERT INTO insider_stories
      (issue_id, slug, eyebrow, cta_label, title, blurb,
       image_url, image_file_id, image_alt, read_time, body,
       display_order, status, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $14)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<InsiderStoryRow>(executor, sql, [
    issueId,
    input.slug,
    input.eyebrow,
    input.ctaLabel,
    input.title,
    input.blurb,
    input.imageUrl,
    input.imageFileId,
    input.imageAlt,
    input.readTime,
    JSON.stringify(input.body),
    input.displayOrder,
    input.status,
    createdBy,
  ]);
  return toStory(result.rows[0]);
};

export const update = async (
  issueId: string,
  storyId: string,
  patch: UpdateInsiderStoryInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<InsiderStory | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown, cast = ''): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}${cast}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  if (patch.body !== undefined) assign('body', JSON.stringify(patch.body), '::jsonb');

  // Mutually exclusive by CHECK constraint: setting one side clears the other.
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

  if (assignments.length === 0) return findById(issueId, storyId, executor);

  assign('updated_by', updatedBy);

  values.push(storyId);
  const storyParam = values.length;
  values.push(issueId);
  const sql = `
    UPDATE insider_stories SET ${assignments.join(', ')}
     WHERE id = $${storyParam} AND issue_id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<InsiderStoryRow>(executor, sql, values);
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

export const updateStatus = async (
  issueId: string,
  storyId: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<InsiderStory | null> => {
  const sql = `
    UPDATE insider_stories SET status = $3, updated_by = $4
     WHERE id = $1 AND issue_id = $2
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<InsiderStoryRow>(executor, sql, [
    storyId,
    issueId,
    status,
    updatedBy,
  ]);
  return result.rows[0] ? toStory(result.rows[0]) : null;
};

/**
 * Rewrites display_order for one issue's stories in one statement, each row's
 * position taken from its index in the array.
 */
export const applyOrder = async (
  issueId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const sql = `
    UPDATE insider_stories AS st
       SET display_order = ordered.position, updated_by = $3
      FROM unnest($2::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE st.id = ordered.id AND st.issue_id = $1
  `;
  const result = await runQuery(executor, sql, [issueId, orderedIds, updatedBy]);
  return result.rowCount ?? 0;
};

/** A hard delete; INACTIVE covers "hide it for now". */
export const remove = async (
  issueId: string,
  storyId: string,
  executor?: Executor,
): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM insider_stories WHERE id = $1 AND issue_id = $2',
    [storyId, issueId],
  );
  return (result.rowCount ?? 0) > 0;
};
