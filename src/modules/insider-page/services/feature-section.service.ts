// src/modules/insider-page/services/feature-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading, plainHeading } from '../../home-page/utils/heading-markup';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as featureRepository from '../repositories/feature-section.repository';
import {
  InsiderFeatureSection,
  PublicInsiderFeatureSection,
  ReplaceInsiderFeatureSectionInput,
  ResolvedInsiderFeatureSection,
} from '../types/feature-section.types';
import { INSIDER_IMAGE_SPECS } from '../utils/insider-image-spec';

const MODULE = 'insider_page';
const ENTITY = 'insider_feature_section';

const toResolved = async (
  section: InsiderFeatureSection,
): Promise<ResolvedInsiderFeatureSection> => ({
  ...section,
  image: await resolveImageSource(section.imageUrl, section.imageFileId),
  headingLines: parseHeading(section.heading),
});

const toPublic = (section: ResolvedInsiderFeatureSection): PublicInsiderFeatureSection => ({
  badge: section.badge,
  eyebrow: section.eyebrow,
  heading: section.heading,
  headingLines: section.headingLines,
  body: section.body,
  bullets: section.bullets,
  image: section.image,
  // Same fallback as the heroes: an image is never announced unlabelled.
  // Not authored: the heading stands in, so an image is never announced
  // unlabelled - the same rule the heroes and story cards follow.
  imageAlt: section.image ? plainHeading(section.heading) : null,
});

const auditSnapshot = (section: InsiderFeatureSection): Record<string, unknown> => ({
  badge: section.badge,
  eyebrow: section.eyebrow,
  heading: section.heading,
  body: section.body,
  bullets: section.bullets,
  imageUrl: section.imageUrl,
  imageFileId: section.imageFileId,
  status: section.status,
});

/**
 * The admin read. Null when the section has never been saved, which the form
 * treats as "start blank" - the first PUT creates the row.
 */
export const get = async (): Promise<ResolvedInsiderFeatureSection | null> => {
  const section = await featureRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read, with three distinct outcomes the site handles
 * differently:
 *
 *   ACTIVE       the public shape - render it.
 *   INACTIVE     null - an admin chose to hide the section, so hide it.
 *   never saved  404 - nothing has been authored, so the site keeps its own
 *                static copy, exactly as when the API is unreachable.
 */
export const getPublished = async (): Promise<PublicInsiderFeatureSection | null> => {
  const section = await featureRepository.find();
  if (!section) throw new NotFoundError('Feature section');
  if (section.status !== 'ACTIVE') return null;
  return toPublic(await toResolved(section));
};

export const replace = async (
  input: ReplaceInsiderFeatureSectionInput,
  context: RequestContext,
): Promise<ResolvedInsiderFeatureSection> => {
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, INSIDER_IMAGE_SPECS.feature, 'imageFileId');
  }

  const section = await withTransaction(async (client) => {
    const existing = await featureRepository.findForUpdate(client);
    const saved = await featureRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_FEATURE_SECTION_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        // Null on the first save: there was no section before it.
        oldValues: existing ? auditSnapshot(existing) : null,
        newValues: auditSnapshot(saved),
      },
      context,
      client,
    );

    return saved;
  });

  return toResolved(section);
};
