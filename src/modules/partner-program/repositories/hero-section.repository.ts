// src/modules/partner-program/repositories/hero-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import {
  PartnerProgramHeroSection,
  ReplacePartnerProgramHeroSectionInput,
} from '../types/hero-section.types';

/**
 * The section is a singleton row pinned to id = 1 by a CHECK constraint, so
 * every statement here addresses it by that constant rather than by a caller-
 * supplied id.
 */
const SINGLETON_ID = 1;

const COLUMNS = `
  eyebrow, heading, subtext,
  image_url, image_file_id,
  mobile_image_url, mobile_image_file_id,
  updated_by, created_at, updated_at
`;

interface PartnerProgramHeroRow {
  eyebrow: string;
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

const toSection = (row: PartnerProgramHeroRow): PartnerProgramHeroSection => ({
  eyebrow: row.eyebrow,
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
export const find = async (
  executor?: Executor,
): Promise<PartnerProgramHeroSection | null> => {
  const result = await runQuery<PartnerProgramHeroRow>(
    executor,
    `SELECT ${COLUMNS} FROM partner_program_hero WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise and each audits the other's result. */
export const findForUpdate = async (
  executor: Executor,
): Promise<PartnerProgramHeroSection | null> => {
  const result = await runQuery<PartnerProgramHeroRow>(
    executor,
    `SELECT ${COLUMNS} FROM partner_program_hero WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Writes the whole section. An upsert, so the first save creates the row and
 * every later one replaces it - the section has no separate "create" step.
 */
export const upsert = async (
  input: ReplacePartnerProgramHeroSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<PartnerProgramHeroSection> => {
  const sql = `
    INSERT INTO partner_program_hero
      (id, eyebrow, heading, subtext, image_url, image_file_id,
       mobile_image_url, mobile_image_file_id, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE SET
      eyebrow = EXCLUDED.eyebrow,
      heading = EXCLUDED.heading,
      subtext = EXCLUDED.subtext,
      image_url = EXCLUDED.image_url,
      image_file_id = EXCLUDED.image_file_id,
      mobile_image_url = EXCLUDED.mobile_image_url,
      mobile_image_file_id = EXCLUDED.mobile_image_file_id,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<PartnerProgramHeroRow>(executor, sql, [
    SINGLETON_ID,
    input.eyebrow,
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
