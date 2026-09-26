// src/modules/about-page/repositories/team-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { AboutTeamSection, ReplaceAboutTeamSectionInput } from '../types/team.types';

/** Pinned to id = 1 by a CHECK constraint - see the hero repository. */
const SINGLETON_ID = 1;

const COLUMNS = `
  eyebrow, heading, subtext,
  updated_by, created_at, updated_at
`;

interface AboutTeamSectionRow {
  eyebrow: string;
  heading: string;
  subtext: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: AboutTeamSectionRow): AboutTeamSection => ({
  eyebrow: row.eyebrow,
  heading: row.heading,
  subtext: row.subtext,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the section's copy has never been authored. */
export const find = async (executor?: Executor): Promise<AboutTeamSection | null> => {
  const result = await runQuery<AboutTeamSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_team_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise. */
export const findForUpdate = async (
  executor: Executor,
): Promise<AboutTeamSection | null> => {
  const result = await runQuery<AboutTeamSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_team_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** An upsert: the first save creates the row, every later one replaces it. */
export const upsert = async (
  input: ReplaceAboutTeamSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<AboutTeamSection> => {
  const sql = `
    INSERT INTO about_team_section (id, eyebrow, heading, subtext, updated_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET
      eyebrow = EXCLUDED.eyebrow,
      heading = EXCLUDED.heading,
      subtext = EXCLUDED.subtext,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutTeamSectionRow>(executor, sql, [
    SINGLETON_ID,
    input.eyebrow,
    input.heading,
    input.subtext,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
