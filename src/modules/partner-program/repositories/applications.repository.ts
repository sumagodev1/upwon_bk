// src/modules/partner-program/repositories/applications.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreatePartnerApplicationInput,
  PartnerApplication,
  PartnerApplicationFilters,
  PartnerApplicationSummary,
} from '../types/applications.types';

/**
 * What the applicant filled in. work_email is cast to text because pg has no
 * parser registered for citext's oid, exactly as the audit log's actor email is.
 */
const LIST_COLUMNS = `
  id, full_name, company, role, background, mobile,
  work_email::text AS work_email, created_at
`;

/**
 * The detail read adds the triage columns - see PartnerApplication.
 *
 * host() rather than ::text: the text cast of an inet always appends the
 * netmask, so a single address reads as '203.0.113.5/32'. The audit log lives
 * with that because nobody copies an address out of it; this one is read by a
 * person deciding whether two applications came from the same place.
 */
const DETAIL_COLUMNS = `
  ${LIST_COLUMNS},
  host(submitted_ip) AS submitted_ip, submitted_user_agent
`;

interface PartnerApplicationRow {
  id: string;
  full_name: string;
  company: string;
  role: string | null;
  background: string | null;
  mobile: string;
  work_email: string;
  created_at: Date;
}

interface PartnerApplicationDetailRow extends PartnerApplicationRow {
  submitted_ip: string | null;
  submitted_user_agent: string | null;
}

const toSummary = (row: PartnerApplicationRow): PartnerApplicationSummary => ({
  id: row.id,
  fullName: row.full_name,
  company: row.company,
  role: row.role,
  background: row.background,
  mobile: row.mobile,
  workEmail: row.work_email,
  createdAt: row.created_at,
});

const toApplication = (row: PartnerApplicationDetailRow): PartnerApplication => ({
  ...toSummary(row),
  submittedIp: row.submitted_ip,
  submittedUserAgent: row.submitted_user_agent,
});

// ── write ─────────────────────────────────────────────────────────────────

/**
 * The applicant's insert. Returns the id and nothing else: the caller answers
 * 201 with a receipt, never with the stored row.
 */
export const insert = async (
  input: CreatePartnerApplicationInput,
  triage: { ip: string | null; userAgent: string | null },
  executor?: Executor,
): Promise<string> => {
  const sql = `
    INSERT INTO partner_program_applications
      (full_name, company, role, background, mobile, work_email,
       submitted_ip, submitted_user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)
    RETURNING id
  `;
  const result = await runQuery<{ id: string }>(executor, sql, [
    input.fullName,
    input.company,
    input.role,
    input.background,
    input.mobile,
    input.workEmail,
    triage.ip,
    triage.userAgent,
  ]);
  return result.rows[0].id;
};

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * The admin list, newest first.
 *
 * No sort whitelist: this list has exactly one useful order, and offering
 * "oldest first" on a list whose only job is "who applied while I was away"
 * would be a control nobody uses. `search` matches the three fields an admin
 * actually recognises an applicant by - the person, their firm, their address.
 */
export const findAll = async (
  filters: PartnerApplicationFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<PartnerApplicationSummary>> => {
  const builder = new SqlBuilder();
  builder
    .whereIf(filters.dateFrom, {
      column: 'created_at',
      operator: '>=',
      value: filters.dateFrom,
    })
    .whereIf(filters.dateTo, { column: 'created_at', operator: '<=', value: filters.dateTo });

  if (pagination.search) {
    /*
     * The search text is a literal, so ILIKE's own metacharacters are escaped
     * before it is wrapped: '%' matches any run and '_' any single character, and
     * a value ending in a backslash would escape the closing '%' and quietly drop
     * the trailing wildcard. An admin typing 'A_1 Foods' means those characters,
     * not a pattern - and '%' on its own must match nothing rather than the whole
     * inbox. The value was always a bound parameter, so this is about what the
     * search means, not about injection.
     */
    const literal = pagination.search.replace(/[\\%_]/g, (char) => `\\${char}`);
    const pattern = `%${literal}%`;
    builder.raw(
      '(full_name ILIKE ? OR company ILIKE ? OR work_email::text ILIKE ?)',
      pattern,
      pattern,
      pattern,
    );
  }

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  // id DESC as a secondary key makes paging deterministic: without it, two
  // applications sharing a timestamp can appear on two pages or on neither.
  const sql = `
    SELECT ${LIST_COLUMNS},
           COUNT(*) OVER() AS total_count
      FROM partner_program_applications
    ${whereClause}
     ORDER BY created_at DESC, id DESC
    ${limitClause}
  `;

  const result = await runQuery<PartnerApplicationRow & { total_count: number }>(
    undefined,
    sql,
    builder.getValues(),
  );

  return {
    rows: result.rows.map(toSummary),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<PartnerApplication | null> => {
  const result = await runQuery<PartnerApplicationDetailRow>(
    executor,
    `SELECT ${DETAIL_COLUMNS} FROM partner_program_applications WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toApplication(result.rows[0]) : null;
};

/** Locks the row, so two admins deleting the same application serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<PartnerApplication | null> => {
  const result = await runQuery<PartnerApplicationDetailRow>(
    executor,
    `SELECT ${DETAIL_COLUMNS} FROM partner_program_applications WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toApplication(result.rows[0]) : null;
};

// ── delete ────────────────────────────────────────────────────────────────

/** A hard delete. The audit row written alongside it is what survives. */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(
    executor,
    'DELETE FROM partner_program_applications WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
};
