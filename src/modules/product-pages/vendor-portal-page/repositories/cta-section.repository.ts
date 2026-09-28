// src/modules/product-pages/vendor-portal-page/repositories/cta-section.repository.ts

import { Executor, runQuery } from '../../../../config/database';
import { UpsertVmsCtaSectionInput, VmsCtaSection } from '../types/cta-section.types';

/**
 * One row, guarded by the `singleton` primary key: the band the page closes
 * with.
 */

const COLUMNS = `
  image_url, image_file_id, mobile_image_url, mobile_image_file_id,
  primary_label, primary_href, secondary_label, secondary_href,
  created_by, updated_by, created_at, updated_at
`;

interface Row {
  image_url: string | null;
  image_file_id: string | null;
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

const toSection = (row: Row): VmsCtaSection => ({
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
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

/** Null when the band has never been authored - a normal first-run state. */
export const findSection = async (executor?: Executor): Promise<VmsCtaSection | null> => {
  const result = await runQuery<Row>(
    executor,
    `SELECT ${COLUMNS} FROM vms_cta_section WHERE singleton = TRUE`,
    [],
  );
  return result.rows[0] ? toSection(result.rows[0]) : null;
};

/**
 * Writes the band whole.
 *
 * ON CONFLICT rather than a read-then-branch: the row is keyed by a constant,
 * so two admins saving at once would otherwise race to insert it and one
 * would get a duplicate-key error instead of an update.
 */
export const upsertSection = async (
  input: UpsertVmsCtaSectionInput,
  updatedBy: string | null,
  executor?: Executor,
): Promise<VmsCtaSection> => {
  const result = await runQuery<Row>(
    executor,
    `INSERT INTO vms_cta_section
       (singleton, image_url, image_file_id, mobile_image_url, mobile_image_file_id,
        primary_label, primary_href, secondary_label, secondary_href,
        created_by, updated_by)
     VALUES (TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     ON CONFLICT (singleton) DO UPDATE SET
       image_url = EXCLUDED.image_url,
       image_file_id = EXCLUDED.image_file_id,
       mobile_image_url = EXCLUDED.mobile_image_url,
       mobile_image_file_id = EXCLUDED.mobile_image_file_id,
       primary_label = EXCLUDED.primary_label,
       primary_href = EXCLUDED.primary_href,
       secondary_label = EXCLUDED.secondary_label,
       secondary_href = EXCLUDED.secondary_href,
       updated_by = EXCLUDED.updated_by
     RETURNING ${COLUMNS}`,
    [
      input.imageUrl,
      input.imageFileId,
      input.mobileImageUrl,
      input.mobileImageFileId,
      input.primaryLabel,
      input.primaryHref,
      input.secondaryLabel,
      input.secondaryHref,
      updatedBy,
    ],
  );
  return toSection(result.rows[0]);
};
