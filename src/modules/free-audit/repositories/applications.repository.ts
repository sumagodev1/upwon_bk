// src/modules/free-audit/repositories/applications.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  CreateFreeAuditApplicationInput,
  FreeAuditApplication,
  FreeAuditApplicationFilters,
  FreeAuditApplicationSummary,
} from '../types/applications.types';
import { FreeAuditRevenueRange } from '../utils/revenue-ranges';

/**
 * What the visitor filled in. email is cast to text because pg has no parser
 * registered for citext's oid, exactly as the Partner Program inbox's
 * work_email is.
 */
const LIST_COLUMNS = `
  id, full_name, company, role, mobile, email::text AS email,
  revenue_range, pain, created_at
`;

/**
 * The detail read adds the triage columns - see FreeAuditApplication.
 *
 * host() rather than ::text: the text cast of an inet always appends the
 * netmask, so a single address reads as '203.0.113.5/32'. This one is read by a
 * person deciding whether two requests came from the same place.
 */
const DETAIL_COLUMNS = `
  ${LIST_COLUMNS},
  host(submitted_ip) AS submitted_ip, submitted_user_agent
`;

interface FreeAuditApplicationRow {
  id: string;
  full_name: string;
  company: string;
  role: string | null;
  mobile: string;
  email: string;
  revenue_range: string;
  pain: string | null;
  created_at: Date;
}

interface FreeAuditApplicationDetailRow extends FreeAuditApplicationRow {
  submitted_ip: string | null;
  submitted_user_agent: string | null;
}

/** The columns keep the table's names; the API speaks the form's. */
const toSummary = (row: FreeAuditApplicationRow): FreeAuditApplicationSummary => ({
  id: row.id,
  name: row.full_name,
  company: row.company,
  role: row.role,
  phone: row.mobile,
  email: row.email,
  // The CHECK constraint guarantees it is one of the four.
  revenueRange: row.revenue_range as FreeAuditRevenueRange,
  pain: row.pain,
  createdAt: row.created_at,
});

const toApplication = (row: FreeAuditApplicationDetailRow): FreeAuditApplication => ({
  ...toSummary(row),
  submittedIp: row.submitted_ip,
  submittedUserAgent: row.submitted_user_agent,
});

// ── write ─────────────────────────────────────────────────────────────────

/**
 * The visitor's insert. Returns the id and nothing else: the caller answers 201
 * with a receipt, never with the stored row.
 */
export const insert = async (
  input: CreateFreeAuditApplicationInput,
  triage: { ip: string | null; userAgent: string | null },
  executor?: Executor,
): Promise<string> => {
  const sql = `
    INSERT INTO free_audit_applications
      (full_name, company, role, mobile, email, revenue_range, pain,
       submitted_ip, submitted_user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet, $9)
    RETURNING id
  `;
  const result = await runQuery<{ id: string }>(executor, sql, [
    input.name,
    input.company,
    input.role,
    input.phone,
    input.email,
    input.revenueRange,
    input.pain,
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
 * "oldest first" on a list whose only job is "who asked for an audit while I
 * was away" would be a control nobody uses. `search` matches the four fields
 * somebody looks a request up by - the person, their company, their address and
 * their number.
 */
export const findAll = async (
  filters: FreeAuditApplicationFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<FreeAuditApplicationSummary>> => {
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
     * before it is wrapped: '%' matches any run and '_' any single character,
     * and a value ending in a backslash would escape the closing '%' and quietly
     * drop the trailing wildcard. An admin typing 'A_1 Foods' means those
     * characters, not a pattern - and '%' on its own must match nothing rather
     * than the whole inbox. The value was always a bound parameter, so this is
     * about what the search means, not about injection.
     */
    const literal = pagination.search.replace(/[\\%_]/g, (char) => `\\${char}`);
    const pattern = `%${literal}%`;
    builder.raw(
      '(full_name ILIKE ? OR company ILIKE ? OR email::text ILIKE ? OR mobile ILIKE ?)',
      pattern,
      pattern,
      pattern,
      pattern,
    );
  }

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  // id DESC as a secondary key makes paging deterministic: without it, two
  // requests sharing a timestamp can appear on two pages or on neither.
  const sql = `
    SELECT ${LIST_COLUMNS},
           COUNT(*) OVER() AS total_count
      FROM free_audit_applications
    ${whereClause}
     ORDER BY created_at DESC, id DESC
    ${limitClause}
  `;

  const result = await runQuery<FreeAuditApplicationRow & { total_count: number }>(
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
): Promise<FreeAuditApplication | null> => {
  const result = await runQuery<FreeAuditApplicationDetailRow>(
    executor,
    `SELECT ${DETAIL_COLUMNS} FROM free_audit_applications WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toApplication(result.rows[0]) : null;
};

/** Locks the row, so two admins deleting the same request serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<FreeAuditApplication | null> => {
  const result = await runQuery<FreeAuditApplicationDetailRow>(
    executor,
    `SELECT ${DETAIL_COLUMNS} FROM free_audit_applications WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toApplication(result.rows[0]) : null;
};

// ── delete ────────────────────────────────────────────────────────────────

/** A hard delete. The audit row written alongside it is what survives. */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM free_audit_applications WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
