// src/modules/about-page/services/hero-section.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading, plainHeading } from '../../home-page/utils/heading-markup';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as heroRepository from '../repositories/hero-section.repository';
import {
  AboutHeroSection,
  PublicAboutHeroBackdrop,
  PublicAboutHeroSection,
  ReplaceAboutHeroSectionInput,
  ResolvedAboutHeroBackdrop,
  ResolvedAboutHeroSection,
} from '../types/hero-section.types';
import { ABOUT_IMAGE_SPECS } from '../utils/about-image-spec';

const MODULE = 'about_page';
const ENTITY = 'about_hero_section';

const resolveBackdrops = async (
  section: AboutHeroSection,
): Promise<ResolvedAboutHeroBackdrop[]> =>
  Promise.all(
    section.backdrops.map(async (backdrop) => {
      const [image, mobileImage] = await Promise.all([
        resolveImageSource(backdrop.imageUrl, backdrop.imageFileId),
        // Null means this backdrop has no phone crop - the site falls back to
        // `image` - and a deleted mobile upload resolves to the same null, so it
        // degrades to the desktop crop rather than to a blank frame.
        resolveImageSource(backdrop.mobileImageUrl, backdrop.mobileImageFileId),
      ]);
      return { ...backdrop, image, mobileImage };
    }),
  );

const toResolved = async (
  section: AboutHeroSection,
): Promise<ResolvedAboutHeroSection> => ({
  ...section,
  backdrops: await resolveBackdrops(section),
  headingLines: parseHeading(section.heading),
});

const toPublic = (section: ResolvedAboutHeroSection): PublicAboutHeroSection => {
  /*
   * One object per slide - { image, mobileImage } - rather than the plain URL
   * this used to hand over, because a slide now carries two crops. The desktop
   * URL keeps the `image` name it had, and mobileImage is null whenever no phone
   * crop is published, which the site reads as "use image at every width".
   *
   * An entry whose DESKTOP upload has been deleted resolves to null and is
   * dropped rather than passed on, so the slider never renders a slide with no
   * src - the rotation shortens by one instead of stalling on a blank frame. A
   * deleted mobile upload is not a reason to drop the slide: it just leaves the
   * desktop crop serving every viewport, which is what most slides do anyway.
   */
  const backdrops: PublicAboutHeroBackdrop[] = section.backdrops
    .filter((backdrop): backdrop is ResolvedAboutHeroBackdrop & { image: string } =>
      backdrop.image !== null,
    )
    .map((backdrop) => ({ image: backdrop.image, mobileImage: backdrop.mobileImage }));

  return {
    eyebrow: section.eyebrow,
    heading: section.heading,
    headingLines: section.headingLines,
    subtext: section.subtext,
    backdrops,
    // Not authored: the heading stands in, so an image is never announced
    // unlabelled - the same rule every other CMS image slot follows. The slider
    // renders these backdrops aria-hidden with an empty alt, so today nothing
    // reads it out; it is returned anyway because the slot is the site's to
    // decide, and a section that hands over images without a description forces
    // the next layout that does need one to invent it.
    //
    // One alt for the set, not one per backdrop: they are interchangeable
    // photographs of the same company behind the same words, and nothing about
    // them is authored - a per-image description would have to be.
    imageAlt: backdrops.length > 0 ? plainHeading(section.heading) : null,
  };
};

const auditSnapshot = (section: AboutHeroSection): Record<string, unknown> => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  subtext: section.subtext,
  backdrops: section.backdrops,
});

/**
 * The admin read. Null when the section has never been saved, which the form
 * treats as "start blank" - the first PUT creates the row.
 */
export const get = async (): Promise<ResolvedAboutHeroSection | null> => {
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
export const getPublished = async (): Promise<PublicAboutHeroSection> => {
  const section = await heroRepository.find();
  if (!section) throw new NotFoundError('About hero section');
  return toPublic(await toResolved(section));
};

export const replace = async (
  input: ReplaceAboutHeroSectionInput,
  context: RequestContext,
): Promise<ResolvedAboutHeroSection> => {
  /*
   * Every uploaded backdrop is checked before anything is written, and each
   * failure names its own slot, so an admin swapping the third photograph is
   * told which one is wrong rather than "the hero is wrong" - and, now that a row
   * has two slots, which of the two.
   *
   * The two specs are different shapes on purpose: the desktop crop is 2:1
   * landscape for a full-bleed band, the phone crop is 2:3 portrait for the same
   * band below the slider's breakpoint. A photograph that passes one will usually
   * fail the other, which is the check doing its job rather than being strict.
   *
   * Only an upload that is NEW to its kind of slot is checked, and that matters
   * here more than anywhere else in the CMS. assertUsableImageFile reads the whole
   * blob back out of storage to measure it, and this section can hold six
   * backdrops carrying two uploads each - so a save that only fixed a comma in the
   * subtext re-sends twelve ids and, checked blindly, would read and decode twelve
   * images before writing a single row. Files are immutable once stored and each id
   * already passed this same spec when it was saved, so an id already stored as a
   * crop of this kind cannot have a new answer.
   *
   * Compared per KIND of slot (desktop ids against stored desktop ids, phone
   * against phone) rather than as one set, so moving a desktop photograph into a
   * phone slot - this row's or another's - is still measured against the phone
   * spec. Not compared per POSITION, because reordering the list is not a reason to
   * re-read six files.
   */
  const stored = await heroRepository.find();
  const storedIds = (kind: 'imageFileId' | 'mobileImageFileId'): Set<string> =>
    new Set(
      (stored?.backdrops ?? [])
        .map((backdrop) => backdrop[kind])
        .filter((id): id is string => id !== null),
    );
  const storedDesktop = storedIds('imageFileId');
  const storedMobile = storedIds('mobileImageFileId');

  for (const [index, backdrop] of input.backdrops.entries()) {
    if (backdrop.imageFileId && !storedDesktop.has(backdrop.imageFileId)) {
      await assertUsableImageFile(
        backdrop.imageFileId,
        ABOUT_IMAGE_SPECS.hero,
        `backdrops[${index}].imageFileId`,
      );
    }
    if (backdrop.mobileImageFileId && !storedMobile.has(backdrop.mobileImageFileId)) {
      await assertUsableImageFile(
        backdrop.mobileImageFileId,
        ABOUT_IMAGE_SPECS.heroMobile,
        `backdrops[${index}].mobileImageFileId`,
      );
    }
  }

  const section = await withTransaction(async (client) => {
    const existing = await heroRepository.findForUpdate(client);
    const saved = await heroRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_HERO_UPDATED,
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
