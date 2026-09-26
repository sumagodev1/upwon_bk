// src/modules/blog/repositories/hero-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { BlogHeroSection, ReplaceBlogHeroSectionInput } from '../types/hero-section.types';

/** Pinned to id = 1 by blog_hero_section_singleton_check. */
const SINGLETON_ID = 1;

const COLUMNS = `
  eyebrow, heading, subtext,
  primary_cta_label, secondary_cta_label,
  updated_by, created_at, updated_at
`;

interface BlogHeroSectionRow {
  eyebrow: string;
  heading: string;
  subtext: string;
  primary_cta_label: string;
  secondary_cta_label: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: BlogHeroSectionRow): BlogHeroSection => ({
  eyebrow: row.eyebrow,
  heading: row.heading,
  subtext: row.subtext,
  primaryCtaLabel: row.primary_cta_label,
  secondaryCtaLabel: row.secondary_cta_label,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the hero has never been authored. */
export const find = async (executor?: Executor): Promise<BlogHeroSection | null> => {
  const result = await runQuery<BlogHeroSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM blog_hero_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise. */
export const findForUpdate = async (executor: Executor): Promise<BlogHeroSection | null> => {
  const result = await runQuery<BlogHeroSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM blog_hero_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** An upsert: the first save creates the row, every later one replaces it. */
export const upsert = async (
  input: ReplaceBlogHeroSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BlogHeroSection> => {
  const sql = `
    INSERT INTO blog_hero_section
      (id, eyebrow, heading, subtext,
       primary_cta_label, secondary_cta_label,
       updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      eyebrow = EXCLUDED.eyebrow,
      heading = EXCLUDED.heading,
      subtext = EXCLUDED.subtext,
      primary_cta_label = EXCLUDED.primary_cta_label,
      secondary_cta_label = EXCLUDED.secondary_cta_label,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<BlogHeroSectionRow>(executor, sql, [
    SINGLETON_ID,
    input.eyebrow,
    input.heading,
    input.subtext,
    input.primaryCtaLabel,
    input.secondaryCtaLabel,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
