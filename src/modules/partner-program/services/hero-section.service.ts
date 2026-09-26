// src/modules/partner-program/services/hero-section.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading, plainHeading } from '../../home-page/utils/heading-markup';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as heroRepository from '../repositories/hero-section.repository';
import {
  PartnerProgramHeroSection,
  PublicPartnerProgramHeroSection,
  ReplacePartnerProgramHeroSectionInput,
  ResolvedPartnerProgramHeroSection,
} from '../types/hero-section.types';
import { PARTNER_IMAGE_SPECS } from '../utils/partner-image-spec';

const MODULE = 'partner_program';
const ENTITY = 'partner_program_hero';

const toResolved = async (
  section: PartnerProgramHeroSection,
): Promise<ResolvedPartnerProgramHeroSection> => {
  const [image, mobileImage] = await Promise.all([
    resolveImageSource(section.imageUrl, section.imageFileId),
    // Null here means "no mobile-specific art" - the site falls back to `image`.
    resolveImageSource(section.mobileImageUrl, section.mobileImageFileId),
  ]);
  return { ...section, image, mobileImage, headingLines: parseHeading(section.heading) };
};

const toPublic = (
  section: ResolvedPartnerProgramHeroSection,
): PublicPartnerProgramHeroSection => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  headingLines: section.headingLines,
  subtext: section.subtext,
  image: section.image,
  // Null means the desktop image serves every viewport: the site renders a
  // <picture> with a narrow-viewport <source> only when a crop is published, and
  // falls back to the one <img> it has always drawn otherwise.
  mobileImage: section.mobileImage,
  // Not authored: the heading stands in, so an image is never announced
  // unlabelled - the same rule every other CMS image slot follows. PageHero
  // renders this backdrop aria-hidden with an empty alt, so today nothing reads
  // it out; it is returned anyway because the slot is the site's to decide, and
  // a section that hands over an image without a description forces the next
  // layout that does need one to invent it.
  //
  // EITHER crop counts. The two slots are independent, so a hero whose only
  // upload is the phone crop is a legal state - and the site renders that crop at
  // every width (`image || mobileImage`), so it is a photograph on the page like
  // any other. Gating on the desktop crop alone handed that one case an image
  // with nothing to describe it.
  imageAlt: section.image || section.mobileImage ? plainHeading(section.heading) : null,
});

const auditSnapshot = (section: PartnerProgramHeroSection): Record<string, unknown> => ({
  eyebrow: section.eyebrow,
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
export const get = async (): Promise<ResolvedPartnerProgramHeroSection | null> => {
  const section = await heroRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read. Two outcomes, because the hero has no status:
 *
 *   authored     the public shape - render it.
 *   never saved  404 - nothing has been authored, so the site keeps its own
 *                built-in copy, exactly as when the API is unreachable.
 */
export const getPublished = async (): Promise<PublicPartnerProgramHeroSection> => {
  const section = await heroRepository.find();
  if (!section) throw new NotFoundError('Partner Program hero section');
  return toPublic(await toResolved(section));
};

export const replace = async (
  input: ReplacePartnerProgramHeroSectionInput,
  context: RequestContext,
): Promise<ResolvedPartnerProgramHeroSection> => {
  /*
   * Each slot is checked against its own spec before anything is written, and
   * each failure names its own field, so an admin who uploaded a landscape photo
   * into the phone slot is told which slot is wrong rather than "the hero is
   * wrong". The mobile spec is portrait where the desktop one is 2:1, which is
   * the whole point of the pair.
   *
   * Only an upload that is NEW IN THIS SLOT is checked. assertUsableImageFile
   * reads the whole blob back out of storage to measure it, and a save that only
   * changed the heading re-sends the file ids it was given - so checking them
   * again is one storage round trip and one image decode per slot for an answer
   * that cannot have changed: files are immutable once stored, and this id already
   * passed this same spec when it was saved. Compared per slot rather than as one
   * set, so moving the desktop file into the phone slot is still checked against
   * the phone spec.
   */
  const stored = await heroRepository.find();

  if (input.imageFileId && input.imageFileId !== stored?.imageFileId) {
    await assertUsableImageFile(input.imageFileId, PARTNER_IMAGE_SPECS.hero, 'imageFileId');
  }
  if (input.mobileImageFileId && input.mobileImageFileId !== stored?.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      PARTNER_IMAGE_SPECS.heroMobile,
      'mobileImageFileId',
    );
  }

  const section = await withTransaction(async (client) => {
    const existing = await heroRepository.findForUpdate(client);
    const saved = await heroRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.PARTNER_HERO_UPDATED,
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
