// src/modules/contact-page/services/hero-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading, plainHeading } from '../../home-page/utils/heading-markup';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as heroRepository from '../repositories/hero-section.repository';
import {
  ContactHeroSection,
  PublicContactHeroSection,
  ReplaceContactHeroSectionInput,
  ResolvedContactHeroSection,
} from '../types/hero-section.types';
import { CONTACT_IMAGE_SPECS } from '../utils/contact-image-spec';

const MODULE = 'contact_page';
const ENTITY = 'contact_hero_section';

const toResolved = async (
  section: ContactHeroSection,
): Promise<ResolvedContactHeroSection> => {
  const [image, mobileImage] = await Promise.all([
    resolveImageSource(section.imageUrl, section.imageFileId),
    // Null here means "no mobile-specific art" - the site falls back to `image`.
    resolveImageSource(section.mobileImageUrl, section.mobileImageFileId),
  ]);
  return { ...section, image, mobileImage, headingLines: parseHeading(section.heading) };
};

const toPublic = (section: ResolvedContactHeroSection): PublicContactHeroSection => ({
  heading: section.heading,
  headingLines: section.headingLines,
  subtext: section.subtext,
  image: section.image,
  mobileImage: section.mobileImage,
  // Not authored: the heading stands in, so an image is never announced
  // unlabelled - the same rule every other CMS image slot follows.
  imageAlt: section.image ? plainHeading(section.heading) : null,
});

const auditSnapshot = (section: ContactHeroSection): Record<string, unknown> => ({
  heading: section.heading,
  subtext: section.subtext,
  imageUrl: section.imageUrl,
  imageFileId: section.imageFileId,
  mobileImageUrl: section.mobileImageUrl,
  mobileImageFileId: section.mobileImageFileId,
});

/**
 * The admin read. Null when the section has never been saved, which the form
 * treats as "start blank" - the first PUT creates the row.
 */
export const get = async (): Promise<ResolvedContactHeroSection | null> => {
  const section = await heroRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read. Two outcomes, because the hero has no status:
 *
 *   authored     the public shape - render it.
 *   never saved  404 - nothing has been authored, so the site keeps its own
 *                static copy, exactly as when the API is unreachable.
 */
export const getPublished = async (): Promise<PublicContactHeroSection> => {
  const section = await heroRepository.find();
  if (!section) throw new NotFoundError('Contact hero section');
  return toPublic(await toResolved(section));
};

export const replace = async (
  input: ReplaceContactHeroSectionInput,
  context: RequestContext,
): Promise<ResolvedContactHeroSection> => {
  if (input.imageFileId) {
    await assertUsableImageFile(
      input.imageFileId,
      CONTACT_IMAGE_SPECS.heroDesktop,
      'imageFileId',
    );
  }
  if (input.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      CONTACT_IMAGE_SPECS.heroMobile,
      'mobileImageFileId',
    );
  }

  const section = await withTransaction(async (client) => {
    const existing = await heroRepository.findForUpdate(client);
    const saved = await heroRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CONTACT_HERO_UPDATED,
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
