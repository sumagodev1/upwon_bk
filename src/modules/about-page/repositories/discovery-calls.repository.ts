// src/modules/about-page/repositories/discovery-calls.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  AboutDiscoveryCall,
  AboutDiscoveryCallFilters,
  AboutDiscoveryCallSummary,
  CreateAboutDiscoveryCallInput,
} from '../types/discovery-calls.types';

/** What the visitor filled in. */
const LIST_COLUMNS = `
  id, name, phone, business, created_at
`;

/**
 * The detail read adds the triage columns - see AboutDiscoveryCall.
 *
 * host() rather than ::text: the text cast of an inet always appends the
 * netmask, so a single address reads as '203.0.113.5/32'. This one is read by a
 * person deciding whether two bookings came from the same place.
 */
const DETAIL_COLUMNS = `
  ${LIST_COLUMNS},
  host(submitted_ip) AS submitted_ip, submitted_user_agent
`;

interface AboutDiscoveryCallRow {
  id: string;
  name: string;
  phone: string;
  business: string | null;
  created_at: Date;
}

interface AboutDiscoveryCallDetailRow extends AboutDiscoveryCallRow {
  submitted_ip: string | null;
  submitted_user_agent: string | null;
}

const toSummary = (row: AboutDiscoveryCallRow): AboutDiscoveryCallSummary => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  business: row.business,
  createdAt: row.created_at,
});

const toCall = (row: AboutDiscoveryCallDetailRow): AboutDiscoveryCall => ({
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
  input: CreateAboutDiscoveryCallInput,
  triage: { ip: string | null; userAgent: string | null },
  executor?: Executor,
): Promise<string> => {
  const sql = `
    INSERT INTO about_discovery_calls
      (name, phone, business, submitted_ip, submitted_user_agent)
    VALUES ($1, $2, $3, $4::inet, $5)
    RETURNING id
  `;
  const result = await runQuery<{ id: string }>(executor, sql, [
    input.name,
    input.phone,
    input.business,
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
 * "oldest first" on a list whose only job is "who asked for a call while I was
 * away" would be a control nobody uses. `search` matches the three fields there
 * are - the person, their number, and the business they mentioned.
 */
export const findAll = async (
  filters: AboutDiscoveryCallFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<AboutDiscoveryCallSummary>> => {
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
      '(name ILIKE ? OR phone ILIKE ? OR business ILIKE ?)',
      pattern,
      pattern,
      pattern,
    );
  }

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  // id DESC as a secondary key makes paging deterministic: without it, two
  // bookings sharing a timestamp can appear on two pages or on neither.
  const sql = `
    SELECT ${LIST_COLUMNS},
           COUNT(*) OVER() AS total_count
      FROM about_discovery_calls
    ${whereClause}
     ORDER BY created_at DESC, id DESC
    ${limitClause}
  `;

  const result = await runQuery<AboutDiscoveryCallRow & { total_count: number }>(
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
): Promise<AboutDiscoveryCall | null> => {
  const result = await runQuery<AboutDiscoveryCallDetailRow>(
    executor,
    `SELECT ${DETAIL_COLUMNS} FROM about_discovery_calls WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toCall(result.rows[0]) : null;
};

/** Locks the row, so two admins deleting the same booking serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<AboutDiscoveryCall | null> => {
  const result = await runQuery<AboutDiscoveryCallDetailRow>(
    executor,
    `SELECT ${DETAIL_COLUMNS} FROM about_discovery_calls WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? toCall(result.rows[0]) : null;
};

// ── delete ────────────────────────────────────────────────────────────────

/** A hard delete. The audit row written alongside it is what survives. */
export const remove = async (id: string, executor?: Executor): Promise<boolean> => {
  const result = await runQuery(executor, 'DELETE FROM about_discovery_calls WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};
