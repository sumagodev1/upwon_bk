// src/modules/home-page/repositories/cta-section.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { CtaSection, UpsertCtaSectionInput } from '../types/cta-section.types';

/**
 * One row, or none. No list, no paging, no ordering - the page has exactly one
 * of these bands, so the read is "the row" and the write is an upsert onto the
 * `singleton` unique column.
 */

const COLUMNS = `
  id, singleton,
  desktop_image_url, desktop_image_file_id,
  mobile_image_url, mobile_image_file_id,
  button_label, report_file_id,
  updated_by, created_at, updated_at
`;

interface SectionRow {
  id: string;
  desktop_image_url: string | null;
  desktop_image_file_id: string | null;
  mobile_image_url: string | null;
  mobile_image_file_id: string | null;
  button_label: string;
  report_file_id: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSection = (row: SectionRow): CtaSection => ({
  id: row.id,
  desktopImageUrl: row.desktop_image_url,
  desktopImageFileId: row.desktop_image_file_id,
  mobileImageUrl: row.mobile_image_url,
  mobileImageFileId: row.mobile_image_file_id,
  buttonLabel: row.button_label,
  reportFileId: row.report_file_id,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const find = async (executor?: Executor): Promise<CtaSection | null> => {
  const result = await runQuery<SectionRow>(
    executor,
    `SELECT ${COLUMNS} FROM home_cta_section LIMIT 1`,
    [],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Creates the band or replaces it.
 *
 * Conflicts on `singleton` rather than on the primary key, which is what makes
 * the table hold one row: a second insert collides with the existing TRUE and
 * updates it instead of adding a row the public read would have to choose
 * between.
 */
export const upsert = async (
  input: UpsertCtaSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<CtaSection> => {
  const result = await runQuery<SectionRow>(
    executor,
    `INSERT INTO home_cta_section
       (singleton, desktop_image_url, desktop_image_file_id,
        mobile_image_url, mobile_image_file_id,
        button_label, report_file_id, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (singleton) DO UPDATE
        SET desktop_image_url = EXCLUDED.desktop_image_url,
            desktop_image_file_id = EXCLUDED.desktop_image_file_id,
            mobile_image_url = EXCLUDED.mobile_image_url,
            mobile_image_file_id = EXCLUDED.mobile_image_file_id,
            button_label = EXCLUDED.button_label,
            report_file_id = EXCLUDED.report_file_id,
            updated_by = EXCLUDED.updated_by
     RETURNING ${COLUMNS}`,
    [
      input.desktopImageUrl,
      input.desktopImageFileId,
      input.mobileImageUrl,
      input.mobileImageFileId,
      input.buttonLabel,
      input.reportFileId,
      updatedBy,
    ],
  );
  return toSection(result.rows[0]);
};
