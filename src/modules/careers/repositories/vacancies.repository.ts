// src/modules/careers/repositories/vacancies.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus, WorkMode } from '../../../config/constants';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  CareerVacancy,
  CareerVacancyFilters,
  CareerVacancySummary,
  CreateCareerVacancyInput,
  UpdateCareerVacancyInput,
} from '../types/vacancies.types';

/**
 * Columns an update may touch. The two jsonb lists are absent because they
 * need an explicit cast - handled in update() - and created_by/updated_by come
 * from the request context, never from the body. display_order is absent
 * because position is changed only by reorder(), which rewrites the whole set.
 */
const UPDATABLE_COLUMNS: Readonly<Record<string, string>> = {
  title: 'title',
  department: 'department',
  location: 'location',
  workMode: 'work_mode',
  description: 'description',
  experience: 'experience',
  status: 'status',
} as const;

const QUALIFIED_COLUMNS = `
  cv.id, cv.title, cv.department, cv.location, cv.work_mode, cv.description,
  cv.requirements, cv.skills, cv.experience, cv.status, cv.display_order,
  cv.created_by, cv.updated_by, cv.created_at, cv.updated_at
`;

const RETURNING_COLUMNS = `
  id, title, department, location, work_mode, description,
  requirements, skills, experience, status, display_order,
  created_by, updated_by, created_at, updated_at
`;

/**
 * A correlated count: one index probe per vacancy on
 * career_applications_vacancy_idx. Cheap at this table's size, and it keeps
 * the count in step with the row it belongs to without a second round trip.
 */
const APPLICATION_COUNT = `
  (SELECT COUNT(*) FROM career_applications ca WHERE ca.vacancy_id = cv.id)
    AS application_count
`;

/** created_at breaks display_order ties, so the list order is stable. */
const VACANCY_ORDER = 'ORDER BY cv.display_order ASC, cv.created_at ASC';

interface CareerVacancyRow {
  id: string;
  title: string;
  department: string;
  location: string;
  work_mode: string;
  description: string;
  /** pg parses jsonb, so these arrive as the arrays they were stored as. */
  requirements: unknown;
  skills: unknown;
  experience: string;
  status: string;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * The CHECK constraint guarantees an array; this guarantees an array of
 * strings, so a hand-edited row cannot put a non-string bullet in front of the
 * renderer.
 */
const toBullets = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const toVacancy = (row: CareerVacancyRow): CareerVacancy => ({
  id: row.id,
  title: row.title,
  department: row.department,
  location: row.location,
  workMode: row.work_mode as WorkMode,
  description: row.description,
  requirements: toBullets(row.requirements),
  skills: toBullets(row.skills),
  experience: row.experience,
  status: row.status as ContentStatus,
  displayOrder: row.display_order,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSummary = (
  row: CareerVacancyRow & { application_count: number },
): CareerVacancySummary => ({
  ...toVacancy(row),
  applicationCount: Number(row.application_count),
});

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * Every vacancy, unpaginated.
 *
 * Unpaginated on purpose, like the Insider archive: a company hiring for more
 * than LIMITS.MAX_VACANCIES roles at once has a different problem, and the
 * reorder arrows need the whole ordered set in front of them - a page 2 that
 * cannot be moved above page 1 is a broken control, not a smaller payload.
 */
export const findAll = async (
  filters: CareerVacancyFilters,
  executor?: Executor,
): Promise<CareerVacancySummary[]> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'cv.status',
    operator: '=',
    value: filters.status,
  });
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    builder.raw(
      '(cv.title ILIKE ? OR cv.department ILIKE ? OR cv.location ILIKE ?)',
      pattern,
      pattern,
      pattern,
    );
  }

  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, ${APPLICATION_COUNT}
      FROM career_vacancies cv
    ${builder.buildWhere()}
    ${VACANCY_ORDER}
  `;
  const result = await runQuery<CareerVacancyRow & { application_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );
  return result.rows.map(toSummary);
};

/** The public list: ACTIVE only, in display order. */
export const findPublished = async (executor?: Executor): Promise<CareerVacancy[]> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}
      FROM career_vacancies cv
     WHERE cv.status = 'ACTIVE'
    ${VACANCY_ORDER}
  `;
  const result = await runQuery<CareerVacancyRow>(executor, sql, []);
  return result.rows.map(toVacancy);
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<CareerVacancySummary | null> => {
  const sql = `
    SELECT ${QUALIFIED_COLUMNS}, ${APPLICATION_COUNT}
      FROM career_vacancies cv
     WHERE cv.id = $1
  `;
  const result = await runQuery<CareerVacancyRow & { application_count: number }>(
    executor,
    sql,
    [id],
  );
  return result.rows[0] ? toSummary(result.rows[0]) : null;
};

/** Locks the row, so two administrators editing the same vacancy serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<CareerVacancy | null> => {
  const sql = `SELECT ${QUALIFIED_COLUMNS} FROM career_vacancies cv WHERE cv.id = $1 FOR UPDATE`;
  const result = await runQuery<CareerVacancyRow>(executor, sql, [id]);
  return result.rows[0] ? toVacancy(result.rows[0]) : null;
};

/**
 * The publication check the public application write depends on.
 *
 * Returns the title as well as the state, because the caller needs both: the
 * title is copied into the application, and an anonymous submission must not
 * be trusted to supply it.
 */
export const findPublishedById = async (
  id: string,
  executor?: Executor,
): Promise<{ id: string; title: string } | null> => {
  const result = await runQuery<{ id: string; title: string }>(
    executor,
    `SELECT id, title FROM career_vacancies WHERE id = $1 AND status = 'ACTIVE'`,
    [id],
  );
  return result.rows[0] ?? null;
};

export const count = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM career_vacancies',
  );
  return Number(result.rows[0]?.count ?? 0);
};

/** Feeds the "append to the end of the list" default on create. */
export const nextDisplayOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM career_vacancies',
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
    'SELECT id FROM career_vacancies WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateCareerVacancyInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<CareerVacancy> => {
  // The two lists are serialised explicitly: handed a JS array, pg would
  // encode it as a Postgres array literal, which is not valid jsonb.
  const sql = `
    INSERT INTO career_vacancies
      (title, department, location, work_mode, description,
       requirements, skills, experience, status, display_order,
       created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $11)
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<CareerVacancyRow>(executor, sql, [
    input.title,
    input.department,
    input.location,
    input.workMode,
    input.description,
    JSON.stringify(input.requirements),
    JSON.stringify(input.skills),
    input.experience,
    input.status,
    input.displayOrder,
    createdBy,
  ]);
  return toVacancy(result.rows[0]);
};

export const update = async (
  id: string,
  patch: UpdateCareerVacancyInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<CareerVacancy | null> => {
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

  if (patch.requirements !== undefined) {
    assign('requirements', JSON.stringify(patch.requirements), '::jsonb');
  }
  if (patch.skills !== undefined) {
    assign('skills', JSON.stringify(patch.skills), '::jsonb');
  }

  if (assignments.length === 0) {
    const current = await findById(id, executor);
    return current;
  }

  assign('updated_by', updatedBy);

  values.push(id);
  const sql = `
    UPDATE career_vacancies SET ${assignments.join(', ')}
     WHERE id = $${values.length}
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<CareerVacancyRow>(executor, sql, values);
  return result.rows[0] ? toVacancy(result.rows[0]) : null;
};

export const updateStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<CareerVacancy | null> => {
  const sql = `
    UPDATE career_vacancies SET status = $2, updated_by = $3
     WHERE id = $1
    RETURNING ${RETURNING_COLUMNS}
  `;
  const result = await runQuery<CareerVacancyRow>(executor, sql, [id, status, updatedBy]);
  return result.rows[0] ? toVacancy(result.rows[0]) : null;
};

/**
 * Rewrites display_order for every listed vacancy in one statement, each row's
 * position taken from its index in the array.
 */
export const applyOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const sql = `
    UPDATE career_vacancies AS cv
       SET display_order = ordered.position, updated_by = $2
      FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
     WHERE cv.id = ordered.id
  `;
  const result = await runQuery(executor, sql, [orderedIds, updatedBy]);
  return result.rowCount ?? 0;
};

/**
 * A hard delete; INACTIVE covers "we are not hiring for this right now".
 *
 * The applications survive it: career_applications.vacancy_id is ON DELETE SET
 * NULL and each row already carries the advertised title, so the inbox keeps
 * reading correctly with the role marked as gone.
 */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM career_vacancies WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
