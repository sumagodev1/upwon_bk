// src/modules/industry-pages/dairy-page/repositories/cta-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { DairyCtaSection, UpsertDairyCtaSectionInput } from '../types/cta-section.types';

// ── the band ──────────────────────────────────────────────────────────────
//
// One row, read and replaced. The singleton column is what an upsert conflicts on.

const COLUMNS = `
  id,
  desktop_image_url, desktop_image_file_id,
  mobile_image_url, mobile_image_file_id,
  primary_label, primary_href, secondary_label, secondary_href,
  created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  desktop_image_url: string | null;
  desktop_image_file_id: string | null;
  mobile_image_url: string | null;
  mobile_image_file_id: string | null;
  primary_label: string;
  primary_href: string;
  secondary_label: string | null;
  secondary_href: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): DairyCtaSection => ({
  id: row.id,
  desktopImageUrl: row.desktop_image_url,
  desktopImageFileId: row.desktop_image_file_id,
  mobileImageUrl: row.mobile_image_url,
  mobileImageFileId: row.mobile_image_file_id,
  primaryLabel: row.primary_label,
  primaryHref: row.primary_href,
  secondaryLabel: row.secondary_label,
  secondaryHref: row.secondary_href,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const find = async (executor?: Executor): Promise<DairyCtaSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM dairy_cta_section LIMIT 1`,
    [],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Creates the band or replaces it.
 *
 * ON CONFLICT on `singleton`, which can only ever be TRUE - so the first save
 * creates the row and every later save replaces it, and an administrator never
 * has to create the record before editing it.
 */
export const upsert = async (
  input: UpsertDairyCtaSectionInput,
  adminId: string | null,
  executor?: Executor,
): Promise<DairyCtaSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO dairy_cta_section
       (singleton, desktop_image_url, desktop_image_file_id,
        mobile_image_url, mobile_image_file_id,
        primary_label, primary_href, secondary_label, secondary_href,
        created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     ON CONFLICT (singleton) DO UPDATE
        SET desktop_image_url = EXCLUDED.desktop_image_url,
            desktop_image_file_id = EXCLUDED.desktop_image_file_id,
            mobile_image_url = EXCLUDED.mobile_image_url,
            mobile_image_file_id = EXCLUDED.mobile_image_file_id,
            primary_label = EXCLUDED.primary_label,
            primary_href = EXCLUDED.primary_href,
            secondary_label = EXCLUDED.secondary_label,
            secondary_href = EXCLUDED.secondary_href,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${COLUMNS}`,
    [
      input.desktopImageUrl,
      input.desktopImageFileId,
      input.mobileImageUrl,
      input.mobileImageFileId,
      input.primaryLabel,
      input.primaryHref,
      input.secondaryLabel,
      input.secondaryHref,
      adminId,
    ],
  );
  return toSection(result.rows[0]);
};
