// src/modules/social-media-links/repositories/contact-lines.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus, SocialContactLineKind } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateSocialContactLineInput,
  SocialContactLine,
  SocialContactLineFilters,
  UpdateSocialContactLineInput,
} from '../types/contact-lines.types';

/**
 * Columns an update may touch. created_by / updated_by come from the request
 * context, never from the body, and display_order is absent because position is
 * changed only by applyOrder(), which rewrites the whole set.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  kind: 'kind',
  icon: 'icon',
  value: 'value',
  status: 'status',
} as const;

const COLUMNS = `
  id, kind, icon, value,
  status, display_order, created_by, updated_by, created_at, updated_at
`;

/** created_at breaks display_order ties, so the list order is stable. */
const LINE_ORDER = 'ORDER BY display_order ASC, created_at ASC';

interface SocialContactLineRow {
  id: string;
  kind: string;
  icon: string;
  value: string;
  status: string;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toLine = (row: SocialContactLineRow): SocialContactLine => ({
  id: row.id,
  kind: row.kind as SocialContactLineKind,
  icon: row.icon,
  value: row.value,
  status: row.status as ContentStatus,
  displayOrder: row.display_order,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * Every line, unpaginated.
 *
 * Unpaginated on purpose, like the About page's people: the footer holds at
 * most LIMITS.MAX_SOCIAL_CONTACT_LINES lines, and the reorder arrows need the
 * whole ordered set in front of them - a page 2 that cannot be moved above
 * page 1 is a broken control, not a smaller payload.
 */
export const findAll = async (
  filters: SocialContactLineFilters,
  executor?: Executor,
): Promise<SocialContactLine[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'status',
    operator: '=',
    value: filters.status,
  });
  if (filters.search) {
    // The kind is matched too, so typing 'phone' finds every phone line.
    const pattern = `%${filters.search}%`;
    builder.raw('(value ILIKE ? OR kind ILIKE ? OR icon ILIKE ?)', pattern, pattern, pattern);
  }

  const sql = `
    SELECT ${COLUMNS}
      FROM social_contact_lines
    ${builder.buildWhere()}
    ${LINE_ORDER}
  `;
  const result = await runQuery<SocialContactLineRow>(executor, sql, builder.getValues());
  return result.rows.map(toLine);
};

/** The public list: ACTIVE only, in display order. */
export const findPublished = async (executor?: Executor): Promise<SocialContactLine[]> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM social_contact_lines
     WHERE status = 'ACTIVE'
    ${LINE_ORDER}
  `;
  const result = await runQuery<SocialContactLineRow>(executor, sql, []);
  return result.rows.map(toLine);
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<SocialContactLine | null> => {
  const result = await runQuery<SocialContactLineRow>(
    executor,
    `SELECT ${COLUMNS} FROM social_contact_lines WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toLine(result.rows[0]) : null;
};

/** Locks the row, so two administrators editing the same line serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<SocialContactLine | null> => {
  const result = await runQuery<SocialContactLineRow>(
    executor,
    `SELECT ${COLUMNS} FROM social_contact_lines WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toLine(result.rows[0]) : null;
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM social_contact_lines',
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end of the list" default on create. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM social_contact_lines',
  );
  return Number(result.rows[0]?.next ?? 0);
};

/** Returns the ids that exist, so a reorder can reject the rest. */
export const findExistingIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM social_contact_lines WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateSocialContactLineInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<SocialContactLine> => {
  const sql = `
    INSERT INTO social_contact_lines
      (kind, icon, value, status, display_order, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $6)
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<SocialContactLineRow>(executor, sql, [
    input.kind,
    input.icon,
    input.value,
    input.status,
    input.displayOrder,
    createdBy,
  ]);
  return toLine(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateSocialContactLineInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<SocialContactLine | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    // undefined is "leave it alone". No column here is nullable.
    if (value === undefined) continue;
    assign(column, value);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    UPDATE social_contact_lines SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<SocialContactLineRow>(executor, sql, values);
  return result.rows[0] ? toLine(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<SocialContactLine | null> => {
  const sql = `
    UPDATE social_contact_lines SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<SocialContactLineRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toLine(result.rows[0]) : null;
};

/**
 * Rewrites display_order for every listed line in one statement, each row's
 * position taken from its index in the array.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const sql = `
    UPDATE social_contact_lines AS l
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE l.id = ordered.id
  `;
  const result = await runQuery(executor, sql, [orderedIds, updatedBy]);
  return result.rowCount ?? 0;
};

/** A hard delete; INACTIVE covers "not in the footer right now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM social_contact_lines WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
