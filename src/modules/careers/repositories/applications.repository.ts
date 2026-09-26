// src/modules/careers/repositories/applications.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ApplicationStatus } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { SqlBuilder } from '../../../core/utils/query-builder';
import {
  CareerApplication,
  CareerApplicationFilters,
  CareerApplicationSummary,
  CreateCareerApplicationInput,
} from '../types/applications.types';

/**
 * What the inbox table lists.
 *
 * email is cast to text because pg has no parser registered for citext's oid,
 * exactly as the audit log's actor email and the enquiry inbox's are.
 *
 * vacancy_title_snapshot is read directly rather than COALESCEd with the
 * vacancy's current title: "applied for X" means the X that was advertised,
 * and a role renamed after the fact must not rewrite what somebody applied to.
 * vacancy_id is still projected, so the admin can tell a renamed role from a
 * deleted one.
 *
 * The files join is LEFT and filtered on deleted_at: a resume purged through
 * the files module leaves the application listed with nothing to download,
 * which is the truth, rather than dropping the candidate from the inbox.
 */
const LIST_COLUMNS = `
  ca.id, ca.vacancy_id, ca.vacancy_title_snapshot,
  ca.full_name, ca.email::text AS email, ca.phone, ca.experience,
  ca.resume_file_id, f.original_name AS resume_file_name,
  ca.status, ca.created_at
`;

const LIST_JOINS = `
  LEFT JOIN files f ON f.id = ca.resume_file_id AND f.deleted_at IS NULL
`;

/**
 * The detail read adds what is read one candidate at a time.
 *
 * host() rather than ::text for the IP: the text cast of an inet always
 * appends the netmask, so a single address reads as '203.0.113.5/32'. This one
 * is read by a person deciding whether two applications came from the same
 * place, so it is printed as an address.
 *
 * status_updated_by is resolved to a name here rather than handed over as a
 * UUID. "Shortlisted by Priya on Tuesday" is the sentence the modal wants; an
 * id is not one, and the alternative - a second request per application to
 * turn it into one - is worse than a join.
 */
const DETAIL_COLUMNS = `
  ${LIST_COLUMNS},
  ca.location, ca.message,
  ca.status_updated_at,
  NULLIF(btrim(COALESCE(adm.first_name, '') || ' ' || COALESCE(adm.last_name, '')), '')
    AS status_updated_by_name,
  host(ca.submitted_ip) AS submitted_ip, ca.submitted_user_agent
`;

const DETAIL_JOINS = `
  ${LIST_JOINS}
  LEFT JOIN admins adm ON adm.id = ca.status_updated_by
`;

interface CareerApplicationRow {
  id: string;
  vacancy_id: string | null;
  vacancy_title_snapshot: string;
  full_name: string;
  email: string;
  phone: string;
  experience: string;
  resume_file_id: string | null;
  resume_file_name: string | null;
  status: string;
  created_at: Date;
}

interface CareerApplicationDetailRow extends CareerApplicationRow {
  location: string;
  message: string | null;
  status_updated_at: Date | null;
  status_updated_by_name: string | null;
  submitted_ip: string | null;
  submitted_user_agent: string | null;
}

const toSummary = (row: CareerApplicationRow): CareerApplicationSummary => ({
  id: row.id,
  vacancyId: row.vacancy_id,
  vacancyTitle: row.vacancy_title_snapshot,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  experience: row.experience,
  // Both halves come from the same LEFT JOIN, so either both are present or
  // there is no downloadable resume.
  resume:
    row.resume_file_id && row.resume_file_name
      ? { fileId: row.resume_file_id, fileName: row.resume_file_name }
      : null,
  status: row.status as ApplicationStatus,
  createdAt: row.created_at,
});

const toApplication = (row: CareerApplicationDetailRow): CareerApplication => ({
  ...toSummary(row),
  location: row.location,
  message: row.message,
  statusUpdatedAt: row.status_updated_at,
  statusUpdatedBy: row.status_updated_by_name,
  submittedIp: row.submitted_ip,
  submittedUserAgent: row.submitted_user_agent,
});

// ── write: the applicant's insert ─────────────────────────────────────────

/**
 * Files one application and returns its id.
 *
 * The vacancy's advertised title and the resume's file id are passed in
 * separately from the validated body: the service reads the first from the
 * vacancy it has just verified and gets the second from the upload it has just
 * stored, and neither may come from the request.
 */
export const insert = async (
  input: CreateCareerApplicationInput,
  extra: {
    vacancyTitleSnapshot: string;
    resumeFileId: string;
    ip: string | null;
    userAgent: string | null;
  },
  executor?: Executor,
): Promise<string> => {
  const sql = `
    INSERT INTO career_applications
      (vacancy_id, vacancy_title_snapshot, full_name, email, phone, location,
       experience, resume_file_id, message, submitted_ip, submitted_user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::inet, $11)
    RETURNING id
  `;
  const result = await runQuery<{ id: string }>(executor, sql, [
    input.vacancyId,
    extra.vacancyTitleSnapshot,
    input.fullName,
    input.email,
    input.phone,
    input.location,
    input.experience,
    extra.resumeFileId,
    input.message,
    extra.ip,
    extra.userAgent,
  ]);
  return result.rows[0].id;
};

// ── admin reads ───────────────────────────────────────────────────────────

/**
 * The admin inbox, newest first.
 *
 * No sort whitelist: an inbox has one useful order, and offering "oldest
 * first" on a list whose job is "who applied while I was away" would be a
 * control nobody uses. `search` matches the two fields a recruiter recognises
 * a candidate by - their name and their address; the vacancy has its own
 * filter, which is exact rather than a substring match.
 */
export const findAll = async (
  filters: CareerApplicationFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<CareerApplicationSummary>> => {
  const builder = new SqlBuilder();
  builder
    .whereIf(filters.vacancyId, {
      column: 'ca.vacancy_id',
      operator: '=',
      value: filters.vacancyId,
    })
    .whereIf(filters.status, { column: 'ca.status', operator: '=', value: filters.status })
    .whereIf(filters.dateFrom, {
      column: 'ca.created_at',
      operator: '>=',
      value: filters.dateFrom,
    })
    .whereIf(filters.dateTo, {
      column: 'ca.created_at',
      operator: '<=',
      value: filters.dateTo,
    });

  if (pagination.search) {
    const pattern = `%${pagination.search}%`;
    builder.raw('(ca.full_name ILIKE ? OR ca.email::text ILIKE ?)', pattern, pattern);
  }

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  // id DESC as a secondary key makes paging deterministic: without it, two
  // applications sharing a timestamp can appear on two pages or on neither -
  // and the admin's "Sr. No." column counts positions across pages, so a row
  // appearing twice is a row that is numbered twice.
  const sql = `
    SELECT ${LIST_COLUMNS},
           COUNT(*) OVER() AS total_count
      FROM career_applications ca
    ${LIST_JOINS}
    ${whereClause}
     ORDER BY ca.created_at DESC, ca.id DESC
    ${limitClause}
  `;

  const result = await runQuery<CareerApplicationRow & { total_count: number }>(
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
): Promise<CareerApplication | null> => {
  const sql = `
    SELECT ${DETAIL_COLUMNS}
      FROM career_applications ca
    ${DETAIL_JOINS}
     WHERE ca.id = $1
  `;
  const result = await runQuery<CareerApplicationDetailRow>(executor, sql, [id]);
  return result.rows[0] ? toApplication(result.rows[0]) : null;
};

/** Locks the row, so two administrators changing the status serialise. */
export const findByIdForUpdate = async (
  id: string,
  executor: Executor,
): Promise<CareerApplication | null> => {
  const sql = `
    SELECT ${DETAIL_COLUMNS}
      FROM career_applications ca
    ${DETAIL_JOINS}
     WHERE ca.id = $1
       FOR UPDATE OF ca
  `;
  const result = await runQuery<CareerApplicationDetailRow>(executor, sql, [id]);
  return result.rows[0] ? toApplication(result.rows[0]) : null;
};

export const countByVacancy = async (
  vacancyId: string,
  executor?: Executor,
): Promise<number> => {
  const result = await runQuery<{ count: number }>(
    executor,
    'SELECT COUNT(*) AS count FROM career_applications WHERE vacancy_id = $1',
    [vacancyId],
  );
  return Number(result.rows[0]?.count ?? 0);
};

// ── admin write: the status, and nothing else ─────────────────────────────

/**
 * The only update on this table.
 *
 * There is no counterpart for the candidate's own answers: full_name, email,
 * phone, location, experience, message and the resume have no update path
 * anywhere in this module, because an application an administrator could
 * rewrite would stop being evidence of what was actually sent.
 */
export const updateStatus = async (
  id: string,
  status: ApplicationStatus,
  updatedBy: string | null,
  executor?: Executor,
): Promise<boolean> => {
  const sql = `
    UPDATE career_applications
       SET status = $2, status_updated_at = now(), status_updated_by = $3
     WHERE id = $1
  `;
  const result = await runQuery(executor, sql, [id, status, updatedBy]);
  return (result.rowCount ?? 0) > 0;
};
