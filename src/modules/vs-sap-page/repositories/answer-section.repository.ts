// src/modules/vs-sap-page/repositories/answer-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import {
  ReplaceVsSapAnswerSectionInput,
  VsSapAnswerSection,
} from '../types/answer-section.types';

/** A singleton row pinned to id = 1 by a CHECK constraint. */
const SINGLETON_ID = 1;

const COLUMNS = `
  eyebrow, heading,
  upwon_title, upwon_points, sap_title, sap_points,
  closing_line,
  updated_by, created_at, updated_at
`;

interface VsSapAnswerSectionRow {
  eyebrow: string;
  heading: string;
  upwon_title: string;
  /** pg parses jsonb, so these arrive as the arrays they were stored as. */
  upwon_points: unknown;
  sap_title: string;
  sap_points: unknown;
  closing_line: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/** The CHECK guarantees an array; this guarantees an array of strings. */
const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const toSection = (row: VsSapAnswerSectionRow): VsSapAnswerSection => ({
  eyebrow: row.eyebrow,
  heading: row.heading,
  upwonTitle: row.upwon_title,
  upwonPoints: toStringList(row.upwon_points),
  sapTitle: row.sap_title,
  sapPoints: toStringList(row.sap_points),
  closingLine: row.closing_line,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the section has never been authored. */
export const find = async (executor?: Executor): Promise<VsSapAnswerSection | null> => {
  const result = await runQuery<VsSapAnswerSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM vs_sap_answer_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise. */
export const findForUpdate = async (executor: Executor): Promise<VsSapAnswerSection | null> => {
  const result = await runQuery<VsSapAnswerSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM vs_sap_answer_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Writes the whole section; the first save creates the row. */
export const upsert = async (
  input: ReplaceVsSapAnswerSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<VsSapAnswerSection> => {
  // The two lists are serialised explicitly: handed a JS array, pg would
  // encode it as a Postgres array literal, which is not valid jsonb.
  const sql = `
    INSERT INTO vs_sap_answer_section
      (id, eyebrow, heading, upwon_title, upwon_points, sap_title, sap_points,
       closing_line, updated_by)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9)
    ON CONFLICT (id) DO UPDATE SET
      eyebrow = EXCLUDED.eyebrow,
      heading = EXCLUDED.heading,
      upwon_title = EXCLUDED.upwon_title,
      upwon_points = EXCLUDED.upwon_points,
      sap_title = EXCLUDED.sap_title,
      sap_points = EXCLUDED.sap_points,
      closing_line = EXCLUDED.closing_line,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<VsSapAnswerSectionRow>(executor, sql, [
    SINGLETON_ID,
    input.eyebrow,
    input.heading,
    input.upwonTitle,
    JSON.stringify(input.upwonPoints),
    input.sapTitle,
    JSON.stringify(input.sapPoints),
    input.closingLine,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
