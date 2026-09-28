// src/modules/industry-pages/dairy-page/services/cta-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS } from '../../../../config/constants';
import { RequestContext } from '../../../../core/types/common.types';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/cta-section.repository';
import { assertUsableImageFile, resolveSource } from '../utils/media';
import {
  DairyCtaSection,
  PublicDairyCtaSection,
  ResolvedDairyCtaSection,
  UpsertDairyCtaSectionInput,
} from '../types/cta-section.types';

const MODULE = 'dairy_page';
const ENTITY = 'dairy_cta_section';

// ── the band ──────────────────────────────────────────────────────────────

const toResolved = async (section: DairyCtaSection): Promise<ResolvedDairyCtaSection> => ({
  ...section,
  desktopImage: await resolveSource(section.desktopImageUrl, section.desktopImageFileId),
  mobileImage: await resolveSource(section.mobileImageUrl, section.mobileImageFileId),
});

/** Null when the band has never been authored - a normal first-run state. */
export const get = async (): Promise<ResolvedDairyCtaSection | null> => {
  const section = await repo.find();
  return section ? toResolved(section) : null;
};

export const upsert = async (
  input: UpsertDairyCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedDairyCtaSection> => {
  if (input.desktopImageFileId) {
    await assertUsableImageFile(
      input.desktopImageFileId,
      'dairyCtaDesktop',
      'desktopImageFileId',
      'Desktop artwork',
    );
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      'dairyCtaMobile',
      'mobileImageFileId',
      'Mobile artwork',
    );
  }

  return withTransaction(async (client) => {
    const existing = await repo.find(client);
    const saved = await repo.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.DAIRY_CTA_SECTION_UPDATED,
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
export const getPublished = async (): Promise<PublicDairyCtaSection | null> => {
  const [copy, section] = await Promise.all([
    sectionCopyService.get('dairy', 'cta'),
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
