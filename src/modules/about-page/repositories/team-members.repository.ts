// src/modules/about-page/repositories/team-members.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  AboutTeamMember,
  AboutTeamMemberFilters,
  CreateAboutTeamMemberInput,
  UpdateAboutTeamMemberInput,
} from '../types/team.types';

/**
 * Columns an update may touch. created_by / updated_by come from the request
 * context, never from the body, and display_order is absent because position is
 * changed only by applyOrder(), which rewrites the whole set.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  name: 'name',
  role: 'role',
  meta: 'meta',
  photoUrl: 'photo_url',
  photoFileId: 'photo_file_id',
  status: 'status',
} as const;

const COLUMNS = `
  id, name, role, meta, photo_url, photo_file_id,
  status, display_order, created_by, updated_by, created_at, updated_at
`;

/** created_at breaks display_order ties, so the list order is stable. */
const MEMBER_ORDER = 'ORDER BY display_order ASC, created_at ASC';

interface AboutTeamMemberRow {
  id: string;
  name: string;
  role: string;
  meta: string;
  photo_url: string | null;
  photo_file_id: string | null;
  status: string;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toMember = (row: AboutTeamMemberRow): AboutTeamMember => ({
  id: row.id,
  name: row.name,
  role: row.role,
  meta: row.meta,
  photoUrl: row.photo_url,
  photoFileId: row.photo_file_id,
  status: row.status as ContentStatus,
  displayOrder: row.display_order,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * Every person, unpaginated.
 *
 * Unpaginated on purpose, like the vacancy list: the grid holds at most
 * LIMITS.MAX_ABOUT_TEAM_MEMBERS people, and the reorder arrows need the whole
 * ordered set in front of them - a page 2 that cannot be moved above page 1 is
 * a broken control, not a smaller payload.
 */
export const findAll = async (
  filters: AboutTeamMemberFilters,
  executor?: Executor,
): Promise<AboutTeamMember[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'status',
    operator: '=',
    value: filters.status,
  });
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    builder.raw('(name ILIKE ? OR role ILIKE ? OR meta ILIKE ?)', pattern, pattern, pattern);
  }

  const sql = `
    SELECT ${COLUMNS}
      FROM about_team_members
    ${builder.buildWhere()}
    ${MEMBER_ORDER}
  `;
  const result = await runQuery<AboutTeamMemberRow>(executor, sql, builder.getValues());
  return result.rows.map(toMember);
};

/** The public list: ACTIVE only, in display order. */
export const findPublished = async (executor?: Executor): Promise<AboutTeamMember[]> => {
  const sql = `
    SELECT ${COLUMNS}
      FROM about_team_members
     WHERE status = 'ACTIVE'
    ${MEMBER_ORDER}
  `;
  const result = await runQuery<AboutTeamMemberRow>(executor, sql, []);
  return result.rows.map(toMember);
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<AboutTeamMember | null> => {
  const result = await runQuery<AboutTeamMemberRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_team_members WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toMember(result.rows[0]) : null;
};

/** Locks the row, so two administrators editing the same person serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<AboutTeamMember | null> => {
  const result = await runQuery<AboutTeamMemberRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_team_members WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toMember(result.rows[0]) : null;
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM about_team_members',
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end of the grid" default on create. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM about_team_members',
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
    'SELECT id FROM about_team_members WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateAboutTeamMemberInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<AboutTeamMember> => {
  const sql = `
    INSERT INTO about_team_members
      (name, role, meta, photo_url, photo_file_id, status, display_order,
       created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutTeamMemberRow>(executor, sql, [
    input.name,
    input.role,
    input.meta,
    input.photoUrl,
    input.photoFileId,
    input.status,
    input.displayOrder,
    createdBy,
  ]);
  return toMember(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateAboutTeamMemberInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<AboutTeamMember | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    // undefined is "leave it alone"; null is a real edit that clears the photo.
    if (value === undefined) continue;
    assign(column, value);
  }

  if (assignments.length === 0) return findById(id, executor);

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    UPDATE about_team_members SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutTeamMemberRow>(executor, sql, values);
  return result.rows[0] ? toMember(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<AboutTeamMember | null> => {
  const sql = `
    UPDATE about_team_members SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutTeamMemberRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toMember(result.rows[0]) : null;
};

/**
 * Rewrites display_order for every listed person in one statement, each row's
 * position taken from its index in the array.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const sql = `
    UPDATE about_team_members AS m
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE m.id = ordered.id
  `;
  const result = await runQuery(executor, sql, [orderedIds, updatedBy]);
  return result.rowCount ?? 0;
};

/** A hard delete; INACTIVE covers "not on the page right now". */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM about_team_members WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
