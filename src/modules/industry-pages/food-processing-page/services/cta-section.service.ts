// src/modules/industry-pages/food-processing-page/services/cta-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS } from '../../../../config/constants';
import { RequestContext } from '../../../../core/types/common.types';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/cta-section.repository';
import { assertUsableImageFile, resolveSource } from '../utils/media';
import {
  FoodProcessingCtaSection,
  PublicFoodProcessingCtaSection,
  ResolvedFoodProcessingCtaSection,
  UpsertFoodProcessingCtaSectionInput,
} from '../types/cta-section.types';

const MODULE = 'food_processing_page';
const ENTITY = 'food_processing_cta_section';

// ── the band ──────────────────────────────────────────────────────────────

const toResolved = async (section: FoodProcessingCtaSection): Promise<ResolvedFoodProcessingCtaSection> => ({
  ...section,
  desktopImage: await resolveSource(section.desktopImageUrl, section.desktopImageFileId),
  mobileImage: await resolveSource(section.mobileImageUrl, section.mobileImageFileId),
});

/** Null when the band has never been authored - a normal first-run state. */
export const get = async (): Promise<ResolvedFoodProcessingCtaSection | null> => {
  const section = await repo.find();
  return section ? toResolved(section) : null;
};

export const upsert = async (
  input: UpsertFoodProcessingCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedFoodProcessingCtaSection> => {
  if (input.desktopImageFileId) {
    await assertUsableImageFile(
      input.desktopImageFileId,
      'foodProcessingCtaDesktop',
      'desktopImageFileId',
      'Desktop artwork',
    );
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      'foodProcessingCtaMobile',
      'mobileImageFileId',
      'Mobile artwork',
    );
  }

  return withTransaction(async (client) => {
    const existing = await repo.find(client);
    const saved = await repo.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FOOD_PROCESSING_CTA_SECTION_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: saved.id,
        oldValues: existing ? { primaryLabel: existing.primaryLabel } : undefined,
        newValues: { primaryLabel: saved.primaryLabel },
      },
      context,
      client,
    );

    return toResolved(saved);
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The copy and the band in one response.
 *
 * Null when the copy or the band is missing - the page then hides the band.
 */
export const getPublished = async (): Promise<PublicFoodProcessingCtaSection | null> => {
  const [copy, section] = await Promise.all([
    sectionCopyService.get('food-processing', 'cta'),
    repo.find(),
  ]);
  if (!copy || !section) return null;

  const resolved = await toResolved(section);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    desktopImage: resolved.desktopImage,
    mobileImage: resolved.mobileImage,
    primary: { label: resolved.primaryLabel, href: resolved.primaryHref },
    // Both halves or neither, which the table also enforces.
    secondary:
      resolved.secondaryLabel && resolved.secondaryHref
        ? { label: resolved.secondaryLabel, href: resolved.secondaryHref }
        : null,
  };
};
