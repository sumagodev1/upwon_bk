// src/modules/about-page/repositories/hero-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import {
  AboutHeroBackdrop,
  AboutHeroSection,
  ReplaceAboutHeroSectionInput,
} from '../types/hero-section.types';

/**
 * The section is a singleton row pinned to id = 1 by a CHECK constraint, so
 * every statement here addresses it by that constant rather than by a caller-
 * supplied id.
 */
const SINGLETON_ID = 1;

const COLUMNS = `
  eyebrow, heading, subtext, backdrops,
  updated_by, created_at, updated_at
`;

interface AboutHeroRow {
  eyebrow: string;
  heading: string;
  subtext: string;
  /** pg parses jsonb, so this arrives as the array it was stored as. */
  backdrops: unknown;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/** A stored string that is really there, or null. */
const text = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

/**
 * The CHECK constraint guarantees an array; this guarantees an array of
 * backdrops, so a hand-edited row cannot put a string or a half-filled object in
 * front of the renderer.
 *
 * An entry with no DESKTOP source is dropped: it would render as a slide with no
 * picture above the slider's breakpoint, and the phone crop is defined as the
 * thing that stands in for a desktop image rather than as an image of its own.
 * The validator refuses to write one; this is the same rule applied to whatever
 * is already in the column.
 *
 * The two mobile keys are absent from every entry written before
 * 030_about_page_hero_backdrop_mobile_image.sql, and absent reads as null - which
 * is exactly "no phone crop, so the desktop one serves every viewport".
 */
const toBackdrops = (value: unknown): AboutHeroBackdrop[] => {
  if (!Array.isArray(value)) return [];
  const backdrops: AboutHeroBackdrop[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
    const fields = entry as Record<string, unknown>;
    const url = text(fields.imageUrl);
    const fileId = text(fields.imageFileId);
    if (url === null && fileId === null) continue;
    backdrops.push({
      imageUrl: url,
      imageFileId: fileId,
      mobileImageUrl: text(fields.mobileImageUrl),
      mobileImageFileId: text(fields.mobileImageFileId),
    });
  }
  return backdrops;
};

const toSection = (row: AboutHeroRow): AboutHeroSection => ({
  eyebrow: row.eyebrow,
  heading: row.heading,
  subtext: row.subtext,
  backdrops: toBackdrops(row.backdrops),
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Null means the section has never been authored. */
export const find = async (executor?: Executor): Promise<AboutHeroSection | null> => {
  const result = await runQuery<AboutHeroRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_hero_section WHERE id = $1`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/** Locks the row, so two concurrent saves serialise and each audits the other's result. */
export const findForUpdate = async (
  executor: Executor,
): Promise<AboutHeroSection | null> => {
  const result = await runQuery<AboutHeroRow>(
    executor,
    `SELECT ${COLUMNS} FROM about_hero_section WHERE id = $1 FOR UPDATE`,
    [SINGLETON_ID],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Writes the whole section. An upsert, so the first save creates the row and
 * every later one replaces it - the section has no separate "create" step.
 */
export const upsert = async (
  input: ReplaceAboutHeroSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<AboutHeroSection> => {
  // The backdrop list is serialised explicitly: handed a JS array, pg would
  // encode it as a Postgres array literal, which is not valid jsonb.
  const sql = `
    INSERT INTO about_hero_section
      (id, eyebrow, heading, subtext, backdrops, updated_by)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    ON CONFLICT (id) DO UPDATE SET
      eyebrow = EXCLUDED.eyebrow,
      heading = EXCLUDED.heading,
      subtext = EXCLUDED.subtext,
      backdrops = EXCLUDED.backdrops,
      updated_by = EXCLUDED.updated_by
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<AboutHeroRow>(executor, sql, [
    SINGLETON_ID,
    input.eyebrow,
    input.heading,
    input.subtext,
    JSON.stringify(input.backdrops),
    updatedBy,
  ]);
  return toSection(result.rows[0]);
};
