// src/modules/product-pages/vendor-portal-page/services/cta-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS } from '../../../../config/constants';
import { RequestContext } from '../../../../core/types/common.types';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import {
  assertUsableImageFile,
  resolveImageSource,
} from '../../../home-page/utils/image-asset';
import * as repo from '../repositories/cta-section.repository';
import {
  PublicVmsCtaSection,
  ResolvedVmsCtaSection,
  UpsertVmsCtaSectionInput,
  VmsCtaSection,
} from '../types/cta-section.types';

const MODULE = 'vendor_portal_page';
const ENTITY = 'vms_cta_section';

/** The photograph and its phone crop are different shapes, so different slots. */
const IMAGE_SLOT = 'vmsCtaDesktop' as const;
const MOBILE_IMAGE_SLOT = 'vmsCtaMobile' as const;

const toResolved = async (section: VmsCtaSection): Promise<ResolvedVmsCtaSection> => ({
  ...section,
  image: await resolveImageSource(section.imageUrl, section.imageFileId),
  mobileImage: await resolveImageSource(section.mobileImageUrl, section.mobileImageFileId),
});

/** Null when the band has never been authored - a normal first-run state. */
export const get = async (): Promise<ResolvedVmsCtaSection | null> => {
  const section = await repo.findSection();
  return section ? toResolved(section) : null;
};

export const upsert = async (
  input: UpsertVmsCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedVmsCtaSection> => {
  /*
   * Checked before the transaction opens: each check reads the stored bytes
   * back out of storage, and a round trip to storage does not belong inside
   * an open transaction.
   */
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, IMAGE_SLOT, 'imageFileId');
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      MOBILE_IMAGE_SLOT,
      'mobileImageFileId',
    );
  }

  const section = await withTransaction(async (client) => {
    const existing = await repo.findSection(client);
    const saved = await repo.upsertSection(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_CTA_SECTION_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        oldValues: existing
          ? { primaryLabel: existing.primaryLabel, primaryHref: existing.primaryHref }
          : undefined,
        newValues: { primaryLabel: saved.primaryLabel, primaryHref: saved.primaryHref },
      },
      context,
      client,
    );

    return saved;
  });

  return toResolved(section);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole band in one call: the copy over it and the band itself.
 *
 * Needs both halves. Unlike the list sections there is nothing to drop and
 * still render - a band with no heading is a photograph with two buttons on
 * it - so a missing copy row means the site keeps the band it ships.
 *
 * A photograph whose file has been purged resolves to null and the band is
 * still returned: the copy and the buttons are the point, and the site draws
 * them over its own artwork rather than showing nothing.
 */
export const getPublished = async (): Promise<PublicVmsCtaSection | null> => {
  const [copy, section] = await Promise.all([
    sectionCopyService.get('vms', 'cta'),
    repo.findSection(),
  ]);
  if (!copy || !section) return null;

  const resolved = await toResolved(section);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    image: resolved.image,
    mobileImage: resolved.mobileImage,
    primary: { label: resolved.primaryLabel, href: resolved.primaryHref },
    secondary:
      resolved.secondaryLabel && resolved.secondaryHref
        ? { label: resolved.secondaryLabel, href: resolved.secondaryHref }
        : null,
  };
};
