// src/modules/vs-sap-page/repositories/comparison-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import {
  ReplaceVsSapComparisonSectionInput,
  VsSapComparisonSection,
} from '../types/comparison.types';

/** A singleton row pinned to id = 1 by a CHECK constraint. */
const SINGLETON_ID = 1;

const COLUMNS = `
  eyebrow, heading, subtext,
  tco_upwon, tco_sap, tco_netsuite,
  updated_by, created_at, updated_at
`;

interface VsSapComparisonSectionRow {
  eyebrow: string;
  heading: string;
  subtext: string;
  tco_upwon: string;
  tco_sap: string;
  tco_netsuite: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: VsSapComparisonSectionRow): VsSapComparisonSection => ({
  eyebrow: row.eyebrow,
  heading: row.heading,
  subtext: row.subtext,
  tcoUpwon: row.tco_upwon,
  tcoSap: row.tco_sap,
  tcoNetsuite: row.tco_netsuite,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the table's copy has never been authored. */
export const find = async (executor?: Executor): Promise<VsSapComparisonSection | null> => {
  const result = await runQuery<VsSapComparisonSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM vs_sap_comparison_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise. */
export const findForUpdate = async (
  executor: Executor,
): Promise<VsSapComparisonSection | null> => {
  const result = await runQuery<VsSapComparisonSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM vs_sap_comparison_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** An upsert: the first save creates the row, every later one replaces it. */
export const upsert = async (
  input: ReplaceVsSapComparisonSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<VsSapComparisonSection> => {
  const sql = `
    INSERT INTO vs_sap_comparison_section
      (id, eyebrow, heading, subtext, tco_upwon, tco_sap, tco_netsuite, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      eyebrow = EXCLUDED.eyebrow,
      heading = EXCLUDED.heading,
      subtext = EXCLUDED.subtext,
      tco_upwon = EXCLUDED.tco_upwon,
      tco_sap = EXCLUDED.tco_sap,
      tco_netsuite = EXCLUDED.tco_netsuite,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<VsSapComparisonSectionRow>(executor, sql, [
    SINGLETON_ID,
    input.eyebrow,
    input.heading,
    input.subtext,
    input.tcoUpwon,
    input.tcoSap,
    input.tcoNetsuite,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
