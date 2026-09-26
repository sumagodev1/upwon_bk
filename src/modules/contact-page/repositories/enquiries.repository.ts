// src/modules/contact-page/repositories/enquiries.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  ContactEnquiry,
  ContactEnquiryFilters,
  ContactEnquirySummary,
  CreateContactEnquiryInput,
} from '../types/enquiries.types';

/**
 * What the visitor answered. work_email is cast to text because pg has no
 * parser registered for citext's oid, exactly as the audit log's actor email is.
 */
const LIST_COLUMNS = `
  id, full_name, work_email::text AS work_email, phone, company, role,
  business_type, revenue_range, platforms, message, created_at
`;

/**
 * The detail read adds the triage columns - see ContactEnquiry.
 *
 * host() rather than ::text: the text cast of an inet always appends the
 * netmask, so a single address reads as '203.0.113.5/32'. The audit log lives
 * with that because nobody copies an address out of it; this one is read by a
 * person deciding whether two enquiries came from the same place.
 */
const DETAIL_COLUMNS = `
  ${LIST_COLUMNS},
  host(submitted_ip) AS submitted_ip, submitted_user_agent
`;

interface ContactEnquiryRow {
  id: string;
  full_name: string;
  work_email: string;
  phone: string | null;
  company: string;
  role: string | null;
  business_type: string;
  revenue_range: string;
  /** pg parses jsonb, so this arrives as the array it was stored as. */
  platforms: unknown;
  message: string | null;
  created_at: Date;
}

interface ContactEnquiryDetailRow extends ContactEnquiryRow {
  submitted_ip: string | null;
  submitted_user_agent: string | null;
}

/** The CHECK guarantees an array; this guarantees an array of strings. */
const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const toSummary = (row: ContactEnquiryRow): ContactEnquirySummary => ({
  id: row.id,
  fullName: row.full_name,
  workEmail: row.work_email,
  phone: row.phone,
  company: row.company,
  role: row.role,
  businessType: row.business_type,
  revenueRange: row.revenue_range,
  platforms: toStringList(row.platforms),
  message: row.message,
  createdAt: row.created_at,
});

const toEnquiry = (row: ContactEnquiryDetailRow): ContactEnquiry => ({
  ...toSummary(row),
  submittedIp: row.submitted_ip,
  submittedUserAgent: row.submitted_user_agent,
});

// ── write ─────────────────────────────────────────────────────────────────

/**
 * The visitor's insert. Returns the id and nothing else: the caller answers
 * 201 with a receipt, never with the stored row.
 */
export const insert = async (
  input: CreateContactEnquiryInput,
  triage: { ip: string | null; userAgent: string | null },
  executor?: Executor,
): Promise<string> => {
  const sql = `
    INSERT INTO contact_enquiries
      (full_name, work_email, phone, company, role,
       business_type, revenue_range, platforms, message,
       submitted_ip, submitted_user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::inet, $11)
    RETURNING id
  `;
  const result = await runQuery<{ id: string }>(executor, sql, [
    input.fullName,
    input.workEmail,
    input.phone,
    input.company,
    input.role,
    input.businessType,
    input.revenueRange,
    // Serialised explicitly: handed a JS array, pg would encode it as a
    // Postgres array literal, which is not valid jsonb.
    JSON.stringify(input.platforms),
    input.message,
    triage.ip,
    triage.userAgent,
  ]);
  return result.rows[0].id;
};

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * The admin inbox, newest first.
 *
 * No sort whitelist: an inbox has exactly one useful order, and offering
 * "oldest first" on a list whose only job is "what came in while I was away"
 * would be a control nobody uses. `search` matches the three fields an admin
 * actually recognises a lead by - the person, their address, their company.
 */
export const findAll = async (
  filters: ContactEnquiryFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<ContactEnquirySummary>> => {
  const builder = new SqlBuilder();
  builder
    .whereIf(filters.dateFrom, {
      column: 'created_at',
      operator: '>=',
      value: filters.dateFrom,
    })
    .whereIf(filters.dateTo, { column: 'created_at', operator: '<=', value: filters.dateTo });

  if (pagination.search) {
    const pattern = `%${pagination.search}%`;
    builder.raw(
      '(full_name ILIKE ? OR work_email::text ILIKE ? OR company ILIKE ?)',
      pattern,
      pattern,
      pattern,
    );
  }

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  // id DESC as a secondary key makes paging deterministic: without it, two
  // enquiries sharing a timestamp can appear on two pages or on neither.
  const sql = `
    SELECT ${LIST_COLUMNS},
           COUNT(*) OVER() AS total_count
      FROM contact_enquiries
    ${whereClause}
     ORDER BY created_at DESC, id DESC
    ${limitClause}
  `;

  const result = await runQuery<ContactEnquiryRow & { total_count: number }>(
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
): Promise<ContactEnquiry | null> => {
  const result = await runQuery<ContactEnquiryDetailRow>(
    executor,
    `SELECT ${DETAIL_COLUMNS} FROM contact_enquiries WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toEnquiry(result.rows[0]) : null;
};

/** Locks the row, so two admins deleting the same enquiry serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<ContactEnquiry | null> => {
  const result = await runQuery<ContactEnquiryDetailRow>(
    executor,
    `SELECT ${DETAIL_COLUMNS} FROM contact_enquiries WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toEnquiry(result.rows[0]) : null;
};

// ── delete ────────────────────────────────────────────────────────────────

/** A hard delete. The audit row written alongside it is what survives. */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM contact_enquiries WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
