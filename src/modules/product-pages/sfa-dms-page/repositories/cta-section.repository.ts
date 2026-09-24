// src/modules/product-pages/sfa-dms-page/repositories/cta-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { SfaCtaSection, UpsertSfaCtaSectionInput } from '../types/cta-section.types';

/** One row, read and replaced. The singleton column is what an upsert conflicts on. */

const COLUMNS = `
  id,
  background_image_url, background_image_file_id,
  dashboard_image_url, dashboard_image_file_id, dashboard_alt,
  button_label, button_href,
  created_by, updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  background_image_url: string | null;
  background_image_file_id: string | null;
  dashboard_image_url: string | null;
  dashboard_image_file_id: string | null;
  dashboard_alt: string | null;
  button_label: string;
  button_href: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): SfaCtaSection => ({
  id: row.id,
  backgroundImageUrl: row.background_image_url,
  backgroundImageFileId: row.background_image_file_id,
  dashboardImageUrl: row.dashboard_image_url,
  dashboardImageFileId: row.dashboard_image_file_id,
  dashboardAlt: row.dashboard_alt,
  buttonLabel: row.button_label,
  buttonHref: row.button_href,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const find = async (executor?: Executor): Promise<SfaCtaSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM sfa_cta_section LIMIT 1`,
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
  input: UpsertSfaCtaSectionInput,
  adminId: string | null,
  executor?: Executor,
): Promise<SfaCtaSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO sfa_cta_section
       (singleton, background_image_url, background_image_file_id,
        dashboard_image_url, dashboard_image_file_id, dashboard_alt,
        button_label, button_href, created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $8)
     ON CONFLICT (singleton) DO UPDATE
        SET background_image_url = EXCLUDED.background_image_url,
            background_image_file_id = EXCLUDED.background_image_file_id,
            dashboard_image_url = EXCLUDED.dashboard_image_url,
            dashboard_image_file_id = EXCLUDED.dashboard_image_file_id,
            dashboard_alt = EXCLUDED.dashboard_alt,
            button_label = EXCLUDED.button_label,
            button_href = EXCLUDED.button_href,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
     RETURNING ${COLUMNS}`,
    [
      input.backgroundImageUrl,
      input.backgroundImageFileId,
      input.dashboardImageUrl,
      input.dashboardImageFileId,
      input.dashboardAlt,
      input.buttonLabel,
      input.buttonHref,
      adminId,
    ],
  );
  return toSection(result.rows[0]);
};
