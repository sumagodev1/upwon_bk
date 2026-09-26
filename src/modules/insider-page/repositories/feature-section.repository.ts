// src/modules/insider-page/repositories/feature-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { ContentStatus } from '../../../config/constants';
import {
  InsiderFeatureSection,
  ReplaceInsiderFeatureSectionInput,
} from '../types/feature-section.types';

/**
 * The section is a singleton row pinned to id = 1 by a CHECK constraint, so
 * every statement here addresses it by that constant rather than by a caller-
 * supplied id.
 */
const SINGLETON_ID = 1;

const COLUMNS = `
  badge, eyebrow, heading, body, bullets,
  image_url, image_file_id, status,
  updated_by, created_at, updated_at
`;

interface InsiderFeatureSectionRow {
  badge: string | null;
  eyebrow: string;
  heading: string;
  body: string;
  /** pg parses jsonb, so this arrives as the array it was stored as. */
  bullets: unknown;
  image_url: string | null;
  image_file_id: string | null;
  status: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: InsiderFeatureSectionRow): InsiderFeatureSection => ({
  badge: row.badge,
  eyebrow: row.eyebrow,
  heading: row.heading,
  body: row.body,
  // The CHECK guarantees an array; this guarantees an array of strings.
  bullets: Array.isArray(row.bullets)
    ? row.bullets.filter((entry): entry is string => typeof entry === 'string')
    : [],
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  status: row.status as ContentStatus,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the section has never been authored. */
export const find = async (executor?: Executor): Promise<InsiderFeatureSection | null> => {
  const result = await runQuery<InsiderFeatureSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM insider_feature_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise and each audits the other's result. */
export const findForUpdate = async (executor: Executor): Promise<InsiderFeatureSection | null> => {
  const result = await runQuery<InsiderFeatureSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM insider_feature_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Writes the whole section. An upsert, so the first save creates the row and
 * every later one replaces it - the section has no separate "create" step.
 */
export const upsert = async (
  input: ReplaceInsiderFeatureSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<InsiderFeatureSection> => {
  // bullets is serialised explicitly: handed a JS array, pg would encode it as
  // a Postgres array literal, which is not valid jsonb.
  const sql = `
    INSERT INTO insider_feature_section
      (id, badge, eyebrow, heading, body, bullets,
       image_url, image_file_id, status, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
    ON CONFLICT (id) DO UPDATE SET
      badge = EXCLUDED.badge,
      eyebrow = EXCLUDED.eyebrow,
      heading = EXCLUDED.heading,
      body = EXCLUDED.body,
      bullets = EXCLUDED.bullets,
      image_url = EXCLUDED.image_url,
      image_file_id = EXCLUDED.image_file_id,
      status = EXCLUDED.status,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<InsiderFeatureSectionRow>(executor, sql, [
    SINGLETON_ID,
    input.badge,
    input.eyebrow,
    input.heading,
    input.body,
    JSON.stringify(input.bullets),
    input.imageUrl,
    input.imageFileId,
    input.status,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
