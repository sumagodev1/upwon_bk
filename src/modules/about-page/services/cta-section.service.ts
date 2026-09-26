// src/modules/about-page/services/cta-section.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading, plainHeading } from '../../home-page/utils/heading-markup';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as ctaRepository from '../repositories/cta-section.repository';
import {
  AboutCtaSection,
  PublicAboutCtaSection,
  ReplaceAboutCtaSectionInput,
  ResolvedAboutCtaSection,
} from '../types/cta-section.types';
import { ABOUT_IMAGE_SPECS } from '../utils/about-image-spec';

const MODULE = 'about_page';
const ENTITY = 'about_cta_section';

const toResolved = async (section: AboutCtaSection): Promise<ResolvedAboutCtaSection> => {
  const [image, mobileImage] = await Promise.all([
    resolveImageSource(section.imageUrl, section.imageFileId),
    // Null here means "nothing published for the narrow layout" - the site keeps
    // the portrait artwork that block already ships. A deleted upload resolves to
    // the same null, so it degrades to that same house picture rather than to a
    // blank card.
    resolveImageSource(section.mobileImageUrl, section.mobileImageFileId),
  ]);
  return { ...section, image, mobileImage, headingLines: parseHeading(section.heading) };
};

const toPublic = (section: ResolvedAboutCtaSection): PublicAboutCtaSection => ({
  heading: section.heading,
  headingLines: section.headingLines,
  subtext: section.subtext,
  image: section.image,
  // Null means nothing is published for the narrow layout: the site renders a
  // <picture> with a (max-width: 1023.98px) <source> only when a crop is published,
  // and otherwise draws the two blocks it has always drawn.
  mobileImage: section.mobileImage,
  // Not authored: the heading stands in, so an image is never announced
  // unlabelled - see the hero service.
  //
  // EITHER crop counts. The two slots are independent, so a banner whose only
  // upload is the narrow-layout crop is a legal state, and it is a photograph on
  // the page like any other. Gating on the wide banner alone handed that one case
  // an image with nothing to describe it.
  imageAlt: section.image || section.mobileImage ? plainHeading(section.heading) : null,
});

const auditSnapshot = (section: AboutCtaSection): Record<string, unknown> => ({
  heading: section.heading,
  subtext: section.subtext,
  imageUrl: section.imageUrl,
  imageFileId: section.imageFileId,
  mobileImageUrl: section.mobileImageUrl,
  mobileImageFileId: section.mobileImageFileId,
});

/** The admin read. Null when the section has never been saved. */
export const get = async (): Promise<ResolvedAboutCtaSection | null> => {
  const section = await ctaRepository.find();
  return section ? toResolved(section) : null;
};

/** The website-facing read. 404 while nothing has been authored. */
export const getPublished = async (): Promise<PublicAboutCtaSection> => {
  const section = await ctaRepository.find();
  if (!section) throw new NotFoundError('About CTA section');
  return toPublic(await toResolved(section));
};

export const replace = async (
  input: ReplaceAboutCtaSectionInput,
  context: RequestContext,
): Promise<ResolvedAboutCtaSection> => {
  /*
   * Each slot is checked against its own spec before anything is written, and
   * each failure names its own field, so an admin who uploaded the wide banner
   * into the narrow-layout slot is told which slot is wrong rather than "the CTA
   * is wrong". The two specs are opposite shapes on purpose - 8:3 landscape for
   * the block that sizes itself to the file, 1:2 portrait for the one that crops
   * the file to fit - so a picture that passes one will fail the other, which is
   * the check doing its job rather than being strict.
   *
   * Only an upload that is NEW IN THIS SLOT is checked. assertUsableImageFile
   * reads the whole blob back out of storage to measure it, and a save that only
   * changed the heading re-sends the file ids it was given - so checking them
   * again is one storage round trip and one image decode per slot for an answer
   * that cannot have changed: files are immutable once stored, and this id already
   * passed this same spec when it was saved. Compared per slot rather than as one
   * set, so moving the banner file into the narrow-layout slot is still checked
   * against the narrow-layout spec.
   */
  const stored = await ctaRepository.find();

  if (input.imageFileId && input.imageFileId !== stored?.imageFileId) {
    await assertUsableImageFile(input.imageFileId, ABOUT_IMAGE_SPECS.cta, 'imageFileId');
  }
  if (input.mobileImageFileId && input.mobileImageFileId !== stored?.mobileImageFileId) {
    await assertUsableImageFile(
      input.mobileImageFileId,
      ABOUT_IMAGE_SPECS.ctaMobile,
      'mobileImageFileId',
    );
  }

  const section = await withTransaction(async (client) => {
    const existing = await ctaRepository.findForUpdate(client);
    const saved = await ctaRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_CTA_UPDATED,
        module: MODULE,
        entityType: ENTITY,
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
