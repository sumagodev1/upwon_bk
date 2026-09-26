// src/modules/blog/repositories/topics-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { BlogTopicsSection, ReplaceBlogTopicsSectionInput } from '../types/topics-section.types';

/** Pinned to id = 1 by blog_topics_section_singleton_check. */
const SINGLETON_ID = 1;

const COLUMNS = `
  eyebrow, heading, subtext,
  updated_by, created_at, updated_at
`;

interface BlogTopicsSectionRow {
  eyebrow: string;
  heading: string;
  subtext: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: BlogTopicsSectionRow): BlogTopicsSection => ({
  eyebrow: row.eyebrow,
  heading: row.heading,
  subtext: row.subtext,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the intro has never been authored. */
export const find = async (executor?: Executor): Promise<BlogTopicsSection | null> => {
  const result = await runQuery<BlogTopicsSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM blog_topics_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise. */
export const findForUpdate = async (executor: Executor): Promise<BlogTopicsSection | null> => {
  const result = await runQuery<BlogTopicsSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM blog_topics_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** An upsert: the first save creates the row, every later one replaces it. */
export const upsert = async (
  input: ReplaceBlogTopicsSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<BlogTopicsSection> => {
  const sql = `
    INSERT INTO blog_topics_section (id, eyebrow, heading, subtext, updated_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET
      eyebrow = EXCLUDED.eyebrow,
      heading = EXCLUDED.heading,
      subtext = EXCLUDED.subtext,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<BlogTopicsSectionRow>(executor, sql, [
    SINGLETON_ID,
    input.eyebrow,
    input.heading,
    input.subtext,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
