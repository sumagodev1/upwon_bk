// src/modules/product-pages/erp-page/repositories/journey-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { ContentStatus } from '../../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../../core/types/common.types';
import { resolveSort, SqlBuilder } from '../../../../core/utils/query-builder';
import { ErpIconName } from '../utils/icons';
import {
  CreateErpJourneyOutcomeInput,
  CreateErpJourneyPersonaInput,
  CreateErpJourneyPointInput,
  CreateErpJourneyStatInput,
  ErpJourneyOutcome,
  ErpJourneyPersona,
  ErpJourneyPersonaFilters,
  ErpJourneyPoint,
  ErpJourneyStat,
  UpdateErpJourneyOutcomeInput,
  UpdateErpJourneyPersonaInput,
  UpdateErpJourneyPointInput,
  UpdateErpJourneyStatInput,
} from '../types/journey-section.types';

/**
 * Four tables behind one section: the personas, each persona's two lists, and
 * the company-wide statistics. The two lists are read in bulk by persona id
 * rather than one query per persona, so assembling the whole section is four
 * round trips whatever the number of personas.
 */

// ── personas ──────────────────────────────────────────────────────────────

const PERSONA_SORT_COLUMNS: Readonly<Record<string, string>> = {
  role: 'p.role',
  title: 'p.title',
  displayOrder: 'p.display_order',
  status: 'p.status',
  createdAt: 'p.created_at',
  updatedAt: 'p.updated_at',
} as const;

/**
 * Columns an update may touch directly. The avatar pair and the metric pair are
 * absent because each needs the "setting one clears the other" handling below,
 * and updated_by is absent because it comes from the request context.
 */
const PERSONA_UPDATABLE: Readonly<Record<string, string>> = {
  role: 'role',
  context: 'context',
  title: 'title',
  description: 'description',
  metricPrefix: 'metric_prefix',
  metricSuffix: 'metric_suffix',
  metricLabel: 'metric_label',
  authorDesignation: 'author_designation',
  authorCompany: 'author_company',
  avatarAlt: 'avatar_alt',
  avatarColor: 'avatar_color',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const PERSONA_COLUMNS = `
  p.id, p.role, p.context, p.title, p.description,
  p.metric_count_to, p.metric_text, p.metric_prefix, p.metric_suffix, p.metric_label,
  p.author_designation, p.author_company,
  p.avatar_url, p.avatar_file_id, p.avatar_alt, p.avatar_color,
  p.display_order, p.status,
  p.created_by, p.updated_by, p.created_at, p.updated_at
`;

const PERSONA_RETURNING = `
  id, role, context, title, description,
  metric_count_to, metric_text, metric_prefix, metric_suffix, metric_label,
  author_designation, author_company,
  avatar_url, avatar_file_id, avatar_alt, avatar_color,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface PersonaRow {
  id: string;
  role: string;
  context: string;
  title: string;
  description: string;
  metric_count_to: number | null;
  metric_text: string | null;
  metric_prefix: string | null;
  metric_suffix: string | null;
  metric_label: string;
  author_designation: string;
  author_company: string;
  avatar_url: string | null;
  avatar_file_id: string | null;
  avatar_alt: string | null;
  avatar_color: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toPersona = (row: PersonaRow): ErpJourneyPersona => ({
  id: row.id,
  role: row.role,
  context: row.context,
  title: row.title,
  description: row.description,
  metricCountTo: row.metric_count_to === null ? null : Number(row.metric_count_to),
  metricText: row.metric_text,
  metricPrefix: row.metric_prefix,
  metricSuffix: row.metric_suffix,
  metricLabel: row.metric_label,
  authorDesignation: row.author_designation,
  authorCompany: row.author_company,
  avatarUrl: row.avatar_url,
  avatarFileId: row.avatar_file_id,
  avatarAlt: row.avatar_alt,
  avatarColor: row.avatar_color,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findPersonaById = async (
  id: string,
  executor?: Executor,
): Promise<ErpJourneyPersona | null> => {
  const result = await runQuery<PersonaRow>(
    executor,
    `SELECT ${PERSONA_COLUMNS} FROM erp_journey_personas p WHERE p.id = $1`,
    [id],
  );
  return result.rows[0] ? toPersona(result.rows[0]) : null;
};

export const findPersonaByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpJourneyPersona | null> => {
  const result = await runQuery<PersonaRow>(
    executor,
    `SELECT ${PERSONA_COLUMNS} FROM erp_journey_personas p WHERE p.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toPersona(result.rows[0]) : null;
};

export const findAllPersonas = async (
  filters: ErpJourneyPersonaFilters,
  pagination: PaginationParams,
  executor?: Executor,
): Promise<PaginatedResult<ErpJourneyPersona>> => {
  const builder = new SqlBuilder();
  builder.whereIf(filters.status, {
    column: 'p.status',
    operator: '=',
    value: filters.status,
  });
  if (pagination.search) {
    builder.raw(
      `(p.role ILIKE ? OR p.context ILIKE ? OR p.title ILIKE ?
        OR p.description ILIKE ? OR p.author_designation ILIKE ?
        OR p.author_company ILIKE ?)`,
      ...Array.from({ length: 6 }, () => `%${pagination.search}%`),
    );
  }

  // Display order is the default: the admin list should read like the section.
  const sort = resolveSort(pagination.sortBy, pagination.sortOrder, PERSONA_SORT_COLUMNS, {
    field: 'displayOrder',
    order: 'asc',
  });

  const sql = `
    SELECT ${PERSONA_COLUMNS}, COUNT(*) OVER() AS total_count
      FROM erp_journey_personas p
    ${builder.buildWhere()}
     ORDER BY ${sort.column} ${sort.order}, p.created_at ASC
    ${builder.buildLimitOffset(pagination.limit, pagination.offset)}
  `;
  const result = await runQuery<PersonaRow & { total_count: number }>(
    executor,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toPersona),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findPublishedPersonas = async (
  executor?: Executor,
): Promise<ErpJourneyPersona[]> => {
  const result = await runQuery<PersonaRow>(
    executor,
    `SELECT ${PERSONA_COLUMNS} FROM erp_journey_personas p
      WHERE p.status = 'ACTIVE'
      ORDER BY p.display_order ASC, p.created_at ASC`,
    [],
  );
  return result.rows.map(toPersona);
};

export const countPersonas = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_journey_personas',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextPersonaOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM erp_journey_personas',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createPersona = async (
  input: CreateErpJourneyPersonaInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpJourneyPersona> => {
  const result = await runQuery<PersonaRow>(
    executor,
    `INSERT INTO erp_journey_personas
       (role, context, title, description,
        metric_count_to, metric_text, metric_prefix, metric_suffix, metric_label,
        author_designation, author_company,
        avatar_url, avatar_file_id, avatar_alt, avatar_color,
        display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)
     RETURNING ${PERSONA_RETURNING}`,
    [
      input.role,
      input.context,
      input.title,
      input.description,
      input.metricCountTo,
      input.metricText,
      input.metricPrefix,
      input.metricSuffix,
      input.metricLabel,
      input.authorDesignation,
      input.authorCompany,
      input.avatarUrl,
      input.avatarFileId,
      input.avatarAlt,
      input.avatarColor,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toPersona(result.rows[0]);
};

export const updatePersona = async (
  id: string,
  patch: UpdateErpJourneyPersonaInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpJourneyPersona | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown): void => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  for (const [key, column] of Object.entries(PERSONA_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    assign(column, value);
  }

  /*
   * Two pairs of columns are mutually exclusive by CHECK, so setting one has to
   * clear the other in the same statement. Without this, patching a URL onto a
   * row that already holds a file id violates the constraint instead of
   * replacing the portrait - and the same for the metric's two forms.
   */
  const assignExclusivePair = (
    columnA: string,
    columnB: string,
    valueA: unknown,
    valueB: unknown,
  ): void => {
    if (valueA !== undefined) {
      assign(columnA, valueA);
      if (valueA !== null && valueB === undefined) assign(columnB, null);
    }
    if (valueB !== undefined) {
      assign(columnB, valueB);
      if (valueB !== null && valueA === undefined) assign(columnA, null);
    }
  };

  assignExclusivePair('avatar_url', 'avatar_file_id', patch.avatarUrl, patch.avatarFileId);
  assignExclusivePair(
    'metric_count_to',
    'metric_text',
    patch.metricCountTo,
    patch.metricText,
  );

  if (assignments.length === 0) return findPersonaById(id, executor);

  assign('updated_by', updatedBy);
  values.push(id);

  const result = await runQuery<PersonaRow>(
    executor,
    `UPDATE erp_journey_personas SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${PERSONA_RETURNING}`,
    values,
  );
  return result.rows[0] ? toPersona(result.rows[0]) : null;
};

export const updatePersonaStatus = async (
  id: string,
  status: ContentStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpJourneyPersona | null> => {
  const result = await runQuery<PersonaRow>(
    executor,
    `UPDATE erp_journey_personas SET status = $2, updated_by = $3
      WHERE id = $1
     RETURNING ${PERSONA_RETURNING}`,
    [id, status, updatedBy],
  );
  return result.rows[0] ? toPersona(result.rows[0]) : null;
};

export const applyPersonaOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE erp_journey_personas AS p
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE p.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingPersonaIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM erp_journey_personas WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

/** Both child lists go with it - each cascades on delete. */
export const removePersona = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_journey_personas WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};

// ── measurable outcomes ───────────────────────────────────────────────────

const OUTCOME_UPDATABLE: Readonly<Record<string, string>> = {
  text: 'text',
  icon: 'icon',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const OUTCOME_COLUMNS = `
  o.id, o.persona_id, o.text, o.icon, o.display_order, o.status,
  o.created_by, o.updated_by, o.created_at, o.updated_at
`;

const OUTCOME_RETURNING = `
  id, persona_id, text, icon, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface OutcomeRow {
  id: string;
  persona_id: string;
  text: string;
  icon: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toOutcome = (row: OutcomeRow): ErpJourneyOutcome => ({
  id: row.id,
  personaId: row.persona_id,
  text: row.text,
  icon: row.icon as ErpIconName,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findOutcomeById = async (
  id: string,
  executor?: Executor,
): Promise<ErpJourneyOutcome | null> => {
  const result = await runQuery<OutcomeRow>(
    executor,
    `SELECT ${OUTCOME_COLUMNS} FROM erp_journey_outcomes o WHERE o.id = $1`,
    [id],
  );
  return result.rows[0] ? toOutcome(result.rows[0]) : null;
};

export const findOutcomeByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpJourneyOutcome | null> => {
  const result = await runQuery<OutcomeRow>(
    executor,
    `SELECT ${OUTCOME_COLUMNS} FROM erp_journey_outcomes o WHERE o.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toOutcome(result.rows[0]) : null;
};

export const findOutcomesByPersona = async (
  personaId: string,
  executor?: Executor,
): Promise<ErpJourneyOutcome[]> => {
  const result = await runQuery<OutcomeRow>(
    executor,
    `SELECT ${OUTCOME_COLUMNS} FROM erp_journey_outcomes o
      WHERE o.persona_id = $1
      ORDER BY o.display_order ASC, o.created_at ASC`,
    [personaId],
  );
  return result.rows.map(toOutcome);
};

/** One query for every persona's outcomes, rather than one query per persona. */
export const findActiveOutcomesForPersonas = async (
  personaIds: string[],
  executor?: Executor,
): Promise<ErpJourneyOutcome[]> => {
  if (personaIds.length === 0) return [];
  const result = await runQuery<OutcomeRow>(
    executor,
    `SELECT ${OUTCOME_COLUMNS} FROM erp_journey_outcomes o
      WHERE o.persona_id = ANY($1::uuid[]) AND o.status = 'ACTIVE'
      ORDER BY o.display_order ASC, o.created_at ASC`,
    [personaIds],
  );
  return result.rows.map(toOutcome);
};

export const countOutcomes = async (
  personaId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_journey_outcomes WHERE persona_id = $1',
    [personaId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextOutcomeOrder = async (
  personaId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM erp_journey_outcomes WHERE persona_id = $1`,
    [personaId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createOutcome = async (
  personaId: string,
  input: CreateErpJourneyOutcomeInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpJourneyOutcome> => {
  const result = await runQuery<OutcomeRow>(
    executor,
    `INSERT INTO erp_journey_outcomes
       (persona_id, text, icon, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING ${OUTCOME_RETURNING}`,
    [personaId, input.text, input.icon, input.displayOrder, input.status, createdBy],
  );
  return toOutcome(result.rows[0]);
};

export const updateOutcome = async (
  id: string,
  patch: UpdateErpJourneyOutcomeInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpJourneyOutcome | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(OUTCOME_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findOutcomeById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<OutcomeRow>(
    executor,
    `UPDATE erp_journey_outcomes SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${OUTCOME_RETURNING}`,
    values,
  );
  return result.rows[0] ? toOutcome(result.rows[0]) : null;
};

export const applyOutcomeOrder = async (
  personaId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE erp_journey_outcomes AS o
        SET display_order = ordered.position, updated_by = $3
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE o.id = ordered.id AND o.persona_id = $2`,
    [orderedIds, personaId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const removeOutcome = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_journey_outcomes WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── beyond the numbers ────────────────────────────────────────────────────

const POINT_UPDATABLE: Readonly<Record<string, string>> = {
  text: 'text',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const POINT_COLUMNS = `
  pt.id, pt.persona_id, pt.text, pt.display_order, pt.status,
  pt.created_by, pt.updated_by, pt.created_at, pt.updated_at
`;

const POINT_RETURNING = `
  id, persona_id, text, display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface PointRow {
  id: string;
  persona_id: string;
  text: string;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toPoint = (row: PointRow): ErpJourneyPoint => ({
  id: row.id,
  personaId: row.persona_id,
  text: row.text,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findPointById = async (
  id: string,
  executor?: Executor,
): Promise<ErpJourneyPoint | null> => {
  const result = await runQuery<PointRow>(
    executor,
    `SELECT ${POINT_COLUMNS} FROM erp_journey_points pt WHERE pt.id = $1`,
    [id],
  );
  return result.rows[0] ? toPoint(result.rows[0]) : null;
};

export const findPointByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpJourneyPoint | null> => {
  const result = await runQuery<PointRow>(
    executor,
    `SELECT ${POINT_COLUMNS} FROM erp_journey_points pt WHERE pt.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toPoint(result.rows[0]) : null;
};

export const findPointsByPersona = async (
  personaId: string,
  executor?: Executor,
): Promise<ErpJourneyPoint[]> => {
  const result = await runQuery<PointRow>(
    executor,
    `SELECT ${POINT_COLUMNS} FROM erp_journey_points pt
      WHERE pt.persona_id = $1
      ORDER BY pt.display_order ASC, pt.created_at ASC`,
    [personaId],
  );
  return result.rows.map(toPoint);
};

/** One query for every persona's points, rather than one query per persona. */
export const findActivePointsForPersonas = async (
  personaIds: string[],
  executor?: Executor,
): Promise<ErpJourneyPoint[]> => {
  if (personaIds.length === 0) return [];
  const result = await runQuery<PointRow>(
    executor,
    `SELECT ${POINT_COLUMNS} FROM erp_journey_points pt
      WHERE pt.persona_id = ANY($1::uuid[]) AND pt.status = 'ACTIVE'
      ORDER BY pt.display_order ASC, pt.created_at ASC`,
    [personaIds],
  );
  return result.rows.map(toPoint);
};

export const countPoints = async (personaId: string, executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_journey_points WHERE persona_id = $1',
    [personaId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextPointOrder = async (
  personaId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next
       FROM erp_journey_points WHERE persona_id = $1`,
    [personaId],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createPoint = async (
  personaId: string,
  input: CreateErpJourneyPointInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpJourneyPoint> => {
  const result = await runQuery<PointRow>(
    executor,
    `INSERT INTO erp_journey_points
       (persona_id, text, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${POINT_RETURNING}`,
    [personaId, input.text, input.displayOrder, input.status, createdBy],
  );
  return toPoint(result.rows[0]);
};

export const updatePoint = async (
  id: string,
  patch: UpdateErpJourneyPointInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpJourneyPoint | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(POINT_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findPointById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<PointRow>(
    executor,
    `UPDATE erp_journey_points SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${POINT_RETURNING}`,
    values,
  );
  return result.rows[0] ? toPoint(result.rows[0]) : null;
};

export const applyPointOrder = async (
  personaId: string,
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE erp_journey_points AS pt
        SET display_order = ordered.position, updated_by = $3
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE pt.id = ordered.id AND pt.persona_id = $2`,
    [orderedIds, personaId, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const removePoint = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_journey_points WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

// ── company-wide statistics ───────────────────────────────────────────────

const STAT_UPDATABLE: Readonly<Record<string, string>> = {
  value: 'value',
  prefix: 'prefix',
  suffix: 'suffix',
  label: 'label',
  description: 'description',
  displayOrder: 'display_order',
  status: 'status',
} as const;

const STAT_COLUMNS = `
  s.id, s.value, s.prefix, s.suffix, s.label, s.description,
  s.display_order, s.status,
  s.created_by, s.updated_by, s.created_at, s.updated_at
`;

const STAT_RETURNING = `
  id, value, prefix, suffix, label, description,
  display_order, status,
  created_by, updated_by, created_at, updated_at
`;

interface StatRow {
  id: string;
  value: string;
  prefix: string | null;
  suffix: string | null;
  label: string;
  description: string | null;
  display_order: number;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toStat = (row: StatRow): ErpJourneyStat => ({
  id: row.id,
  value: row.value,
  prefix: row.prefix,
  suffix: row.suffix,
  label: row.label,
  description: row.description,
  displayOrder: row.display_order,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findStatById = async (
  id: string,
  executor?: Executor,
): Promise<ErpJourneyStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM erp_journey_stats s WHERE s.id = $1`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const findStatByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ErpJourneyStat | null> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM erp_journey_stats s WHERE s.id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const findAllStats = async (executor?: Executor): Promise<ErpJourneyStat[]> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM erp_journey_stats s
      ORDER BY s.display_order ASC, s.created_at ASC`,
    [],
  );
  return result.rows.map(toStat);
};

export const findPublishedStats = async (executor?: Executor): Promise<ErpJourneyStat[]> => {
  const result = await runQuery<StatRow>(
    executor,
    `SELECT ${STAT_COLUMNS} FROM erp_journey_stats s
      WHERE s.status = 'ACTIVE'
      ORDER BY s.display_order ASC, s.created_at ASC`,
    [],
  );
  return result.rows.map(toStat);
};

export const countStats = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM erp_journey_stats',
    [],
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const nextStatOrder = async (executor?: Executor): Promise<number> => {
  const result = await runQuery<{ next: number }>(
    executor,
    'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM erp_journey_stats',
    [],
  );
  return Number(result.rows[0]?.next ?? 0);
};

export const createStat = async (
  input: CreateErpJourneyStatInput & { displayOrder: number },
  createdBy: string | null,
  executor?: Executor,
): Promise<ErpJourneyStat> => {
  const result = await runQuery<StatRow>(
    executor,
    `INSERT INTO erp_journey_stats
       (value, prefix, suffix, label, description, display_order, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING ${STAT_RETURNING}`,
    [
      input.value,
      input.prefix,
      input.suffix,
      input.label,
      input.description,
      input.displayOrder,
      input.status,
      createdBy,
    ],
  );
  return toStat(result.rows[0]);
};

export const updateStat = async (
  id: string,
  patch: UpdateErpJourneyStatInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<ErpJourneyStat | null> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(STAT_UPDATABLE)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findStatById(id, executor);

  values.push(updatedBy);
  assignments.push(`updated_by = $${values.length}`);
  values.push(id);

  const result = await runQuery<StatRow>(
    executor,
    `UPDATE erp_journey_stats SET ${assignments.join(', ')}
      WHERE id = $${values.length}
     RETURNING ${STAT_RETURNING}`,
    values,
  );
  return result.rows[0] ? toStat(result.rows[0]) : null;
};

export const applyStatOrder = async (
  orderedIds: string[],
  updatedBy: string | null,
  executor: Executor,
): Promise<number> => {
  if (orderedIds.length === 0) return 0;
  const result = await runQuery(
    executor,
    `UPDATE erp_journey_stats AS s
        SET display_order = ordered.position, updated_by = $2
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
      WHERE s.id = ordered.id`,
    [orderedIds, updatedBy],
  );
  return result.rowCount ?? 0;
};

export const findExistingStatIds = async (
  ids: string[],
  executor?: Executor,
): Promise<string[]> => {
  if (ids.length === 0) return [];
  const result = await runQuery<{ id: string }>(
    executor,
    'SELECT id FROM erp_journey_stats WHERE id = ANY($1::uuid[])',
    [ids],
  );
  return result.rows.map((row) => row.id);
};

export const removeStat = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM erp_journey_stats WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
