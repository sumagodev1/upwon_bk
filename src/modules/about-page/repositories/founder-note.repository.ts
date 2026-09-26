// src/modules/about-page/repositories/founder-note.repository.ts

import { Executor, runQuery } from '../../../config/database';
import {
  AboutFounderNote,
  ReplaceAboutFounderNoteInput,
} from '../types/founder-note.types';

/** Pinned to id = 1 by a CHECK constraint - see the hero repository. */
const SINGLETON_ID = 1;

const COLUMNS = `
  founder_name, founder_role, company_line, quote, body,
  photo_url, photo_file_id,
  updated_by, created_at, updated_at
`;

interface AboutFounderNoteRow {
  founder_name: string;
  founder_role: string;
  company_line: string;
  quote: string;
  body: string;
  photo_url: string | null;
  photo_file_id: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: AboutFounderNoteRow): AboutFounderNote => ({
  founderName: row.founder_name,
  founderRole: row.founder_role,
  companyLine: row.company_line,
  quote: row.quote,
  body: row.body,
  photoUrl: row.photo_url,
  photoFileId: row.photo_file_id,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the section has never been authored. */
export const find = async (executor?: Executor): Promise<AboutFounderNote | null> => {
  const result = await runQuery<AboutFounderNoteRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_founder_note WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise. */
export const findForUpdate = async (
  executor: Executor,
): Promise<AboutFounderNote | null> => {
  const result = await runQuery<AboutFounderNoteRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_founder_note WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** An upsert: the first save creates the row, every later one replaces it. */
export const upsert = async (
  input: ReplaceAboutFounderNoteInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<AboutFounderNote> => {
  const sql = `
    INSERT INTO about_founder_note
      (id, founder_name, founder_role, company_line, quote, body,
       photo_url, photo_file_id, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE SET
      founder_name = EXCLUDED.founder_name,
      founder_role = EXCLUDED.founder_role,
      company_line = EXCLUDED.company_line,
      quote = EXCLUDED.quote,
      body = EXCLUDED.body,
      photo_url = EXCLUDED.photo_url,
      photo_file_id = EXCLUDED.photo_file_id,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutFounderNoteRow>(executor, sql, [
    SINGLETON_ID,
    input.founderName,
    input.founderRole,
    input.companyLine,
    input.quote,
    input.body,
    input.photoUrl,
    input.photoFileId,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
