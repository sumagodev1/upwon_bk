// src/modules/about-page/repositories/cta-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { AboutCtaSection, ReplaceAboutCtaSectionInput } from '../types/cta-section.types';

/** Pinned to id = 1 by a CHECK constraint - see the hero repository. */
const SINGLETON_ID = 1;

const COLUMNS = `
  heading, subtext,
  image_url, image_file_id,
  mobile_image_url, mobile_image_file_id,
  updated_by, created_at, updated_at
`;

interface AboutCtaSectionRow {
  heading: string;
  subtext: string;
  image_url: string | null;
  image_file_id: string | null;
  mobile_image_url: string | null;
  mobile_image_file_id: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: AboutCtaSectionRow): AboutCtaSection => ({
  heading: row.heading,
  subtext: row.subtext,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  mobileImageUrl: row.mobile_image_url,
  mobileImageFileId: row.mobile_image_file_id,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the section has never been authored. */
export const find = async (executor?: Executor): Promise<AboutCtaSection | null> => {
  const result = await runQuery<AboutCtaSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_cta_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise. */
export const findForUpdate = async (
  executor: Executor,
): Promise<AboutCtaSection | null> => {
  const result = await runQuery<AboutCtaSectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_cta_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** An upsert: the first save creates the row, every later one replaces it. */
export const upsert = async (
  input: ReplaceAboutCtaSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<AboutCtaSection> => {
  const sql = `
    INSERT INTO about_cta_section
      (id, heading, subtext, image_url, image_file_id,
       mobile_image_url, mobile_image_file_id, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      heading = EXCLUDED.heading,
      subtext = EXCLUDED.subtext,
      image_url = EXCLUDED.image_url,
      image_file_id = EXCLUDED.image_file_id,
      mobile_image_url = EXCLUDED.mobile_image_url,
      mobile_image_file_id = EXCLUDED.mobile_image_file_id,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutCtaSectionRow>(executor, sql, [
    SINGLETON_ID,
    input.heading,
    input.subtext,
    input.imageUrl,
    input.imageFileId,
    input.mobileImageUrl,
    input.mobileImageFileId,
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
