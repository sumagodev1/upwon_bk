// src/modules/insider-page/repositories/issues.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateInsiderIssueInput,
  InsiderIssue,
  InsiderIssueFilters,
  InsiderIssueSummary,
  UpdateInsiderIssueInput,
} from '../types/issues.types';

/**
 * Columns an update may touch. is_current is absent because making an issue
 * current also demotes the previous one - see clearCurrent/setCurrentFlag - and
 * updated_by comes from the request context, never from the body.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  slug: 'slug',
  label: 'label',
  issueNumber: 'issue_number',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  ii.id, ii.slug, ii.label, ii.issue_number, ii.is_current, ii.status,
  ii.created_by, ii.updated_by, ii.created_at, ii.updated_at
`;

const RETURNING_COLUMNS = `
  id, slug, label, issue_number, is_current, status,
  created_by, updated_by, created_at, updated_at
`;

/** A correlated count: one index probe per issue on insider_stories_issue_order_idx. */
const STORY_COUNT = `
  (SELECT COUNT(*) FROM insider_stories s WHERE s.issue_id = ii.id) AS story_count
`;

/** Newest first - how both the admin list and the archive nav read. */
const ISSUE_ORDER = 'ORDER BY ii.issue_number DESC';

interface InsiderIssueRow {
  id: string;
  slug: string;
  label: string;
  issue_number: number;
  is_current: boolean;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toIssue = (row: InsiderIssueRow): InsiderIssue => ({
  id: row.id,
  slug: row.slug,
  label: row.label,
  issueNumber: row.issue_number,
  isCurrent: row.is_current,
  status: row.status as ContentStatus,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSummary = (row: InsiderIssueRow & { story_count: number }): InsiderIssueSummary => ({
  ...toIssue(row),
  storyCount: Number(row.story_count),
});

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * Every issue, unpaginated. The Insider is monthly - a decade of issues is 120
 * rows - so paging would cost a round trip and buy nothing.
 */
export const findAll = async (
  filters: InsiderIssueFilters & { search?: string },
  executor?: Executor,
): Promise<InsiderIssueSummary[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'ii.status',
    operator: '=',
    value: filters.status,
  });
  if (filters.search) {
    builder.raw(
      '(ii.label ILIKE ? OR ii.slug ILIKE ?)',
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
    );
  }

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, ${STORY_COUNT}
      FROM insider_issues ii
    ${builder.buildWhere()}
    ${ISSUE_ORDER}
  `;
  const result = await runQuery<InsiderIssueRow & { story_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );
  return result.rows.map(toSummary);
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<InsiderIssueSummary | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, ${STORY_COUNT}
      FROM insider_issues ii
     WHERE ii.id = $1
  `;
  const result = await runQuery<InsiderIssueRow & { story_count: number }>(executor, sql, [id]);
  return result.rows[0] ? toSummary(result.rows[0]) : null;
};

/**
 * Read-then-write paths take the row lock. Story writes lock their parent issue
 * too, which is what serialises the per-issue story limit.
 */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<InsiderIssue | null> => {
  const sql = `SELECT ${QUALIFIED_COLUMNS} FROM insider_issues ii WHERE ii.id = $1 FOR UPDATE`;
  const result = await runQuery<InsiderIssueRow>(executor, sql, [id]);
  return result.rows[0] ? toIssue(result.rows[0]) : null;
};

/** The flagged current issue, whatever its status. */
export const findCurrent = async (executor?: Executor): Promise<InsiderIssue | null> => {
  const sql = `SELECT ${QUALIFIED_COLUMNS} FROM insider_issues ii WHERE ii.is_current`;
  const result = await runQuery<InsiderIssueRow>(executor, sql, []);
  return result.rows[0] ? toIssue(result.rows[0]) : null;
};

/** The public archive: every ACTIVE issue, newest first. */
export const findPublished = async (executor?: Executor): Promise<InsiderIssue[]> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM insider_issues ii
     WHERE ii.status = 'ACTIVE'
    ${ISSUE_ORDER}
  `;
  const result = await runQuery<InsiderIssueRow>(executor, sql, []);
  return result.rows.map(toIssue);
};

export const findPublishedBySlug = async (
  slug: string,
  executor?: Executor,
): Promise<InsiderIssue | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM insider_issues ii
     WHERE ii.slug = $1 AND ii.status = 'ACTIVE'
  `;
  const result = await runQuery<InsiderIssueRow>(executor, sql, [slug]);
  return result.rows[0] ? toIssue(result.rows[0]) : null;
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateInsiderIssueInput,
  createdBy: string | null,
  executor?: Executor,
): Promise<InsiderIssue> => {
  const sql = `
    INSERT INTO insider_issues
      (slug, label, issue_number, is_current, status, created_by, updated_by)
    VALUES (
      $1, $2,
      -- Absent means "the next one": worked out inside the INSERT so two
      -- concurrent creates cannot read the same maximum.
      COALESCE($3::int, (SELECT COALESCE(MAX(issue_number), 0) + 1 FROM insider_issues)),
      $4, $5, $6, $6
    )
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<InsiderIssueRow>(executor, sql, [
    input.slug,
    input.label,
    input.issueNumber ?? null,
    input.isCurrent,
    input.status,
    createdBy,
  ]);
  return toIssue(result.rows[0]);
};

/**
 * Applies the plain columns of a patch. isCurrent, if present, is handled by the
 * service through clearCurrent/setCurrentFlag before this runs.
 */
export const update = async (
  id: string,
  patch: UpdateInsiderIssueInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<InsiderIssue | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  // A patch carrying only isCurrent has nothing left to write here.
  if (assignments.length === 0) return findById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);

  values.push(id);
  const sql = `
    UPDATE insider_issues SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<InsiderIssueRow>(executor, sql, values);
  return result.rows[0] ? toIssue(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<InsiderIssue | null> => {
  const sql = `
    UPDATE insider_issues SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<InsiderIssueRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toIssue(result.rows[0]) : null;
};

/**
 * Demotes whichever issue is current, other than `exceptId`.
 *
 * Always paired with setCurrentFlag in one transaction, and always run first: the
 * partial unique index checks each row as it is written, so promoting before
 * demoting would momentarily hold two current rows and fail.
 */
export const clearCurrent = async (
  exceptId: string,
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  const result = await runQuery(
    executor,
    'UPDATE insider_issues SET is_current = false, updated_by = $2 WHERE is_current AND id <> $1',
    [exceptId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const setCurrentFlag = async (
  id: string,
  isCurrent: boolean,
  updatedBy: string | null,
  executor: Executor,
): Promise<InsiderIssue | null> => {
  const sql = `
    UPDATE insider_issues SET is_current = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<InsiderIssueRow>(executor, sql, [id, isCurrent, updatedBy]);
  return result.rows[0] ? toIssue(result.rows[0]) : null;
};

/** A hard delete. insider_stories.issue_id cascades, so the stories go with it. */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM insider_issues WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
