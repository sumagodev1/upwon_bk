// src/modules/home-page/repositories/section-copy.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { PageKey, SectionKey } from '../../../config/constants';
import { SectionCopy, UpsertSectionCopyInput } from '../types/section-copy.types';

/**
 * One table for every page's shared section copy, keyed by page and section.
 *
 * Deliberately not one table per page or per section: the shape is identical
 * for all of them, and a section that wants its own copy fields would be a
 * section that wants its own table anyway.
 */

const COLUMNS = `
  page_key, section_key, eyebrow, heading, subtext, updated_by, created_at, updated_at
`;

interface CopyRow {
  page_key: string;
  section_key: string;
  eyebrow: string | null;
  heading: string;
  subtext: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toCopy = (row: CopyRow): SectionCopy => ({
  pageKey: row.page_key as PageKey,
  sectionKey: row.section_key as SectionKey,
  eyebrow: row.eyebrow,
  heading: row.heading,
  subtext: row.subtext,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findByKey = async (
  pageKey: PageKey,
  sectionKey: SectionKey,
  executor?: Executor,
): Promise<SectionCopy | null> => {
  const result = await runQuery<CopyRow>(
    executor,
    `SELECT ${COLUMNS} FROM page_section_copy
      WHERE page_key = $1 AND section_key = $2`,
    [pageKey, sectionKey],
  );
  return result.rows[0] ? toCopy(result.rows[0]) : null;
};

/**
 * Creates the section's copy or replaces it.
 *
 * An upsert rather than separate create and update paths: there is exactly one
 * row per section and the panel's form is the same either way, so "has this
 * section been authored yet" is not a distinction worth making callers handle.
 */
export const upsert = async (
  pageKey: PageKey,
  sectionKey: SectionKey,
  input: UpsertSectionCopyInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<SectionCopy> => {
  const result = await runQuery<CopyRow>(
    executor,
    `INSERT INTO page_section_copy
       (page_key, section_key, eyebrow, heading, subtext, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (page_key, section_key) DO UPDATE
        SET eyebrow = EXCLUDED.eyebrow,
            heading = EXCLUDED.heading,
            subtext = EXCLUDED.subtext,
            updated_by = EXCLUDED.updated_by
     RETURNING ${COLUMNS}`,
    [pageKey, sectionKey, input.eyebrow, input.heading, input.subtext, updatedBy],
  );
  return toCopy(result.rows[0]);
};
