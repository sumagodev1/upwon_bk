// src/modules/contact-page/validators/hero-section.validator.ts

import { validator } from '../../../core/utils/validation';
import { ReplaceContactHeroSectionInput } from '../types/hero-section.types';
import { HEADING_MAX, SUBTEXT_MAX, readImagePair, validateHeadingMarkup } from './shared';

/**
 * PUT is a full replace of the singleton: every field is read, and an absent
 * nullable field is stored as null. There is no merge, because the admin form
 * always sends the whole section and a merge would let a stale field survive a
 * save that meant to clear it.
 */
export function validateReplaceContactHeroSection(
  body: unknown,
): ReplaceContactHeroSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeadingMarkup(v, 'heading', heading);

  const desktop = readImagePair(v, 'imageUrl', 'imageFileId');
  const mobile = readImagePair(v, 'mobileImageUrl', 'mobileImageFileId');

  const dto: ReplaceContactHeroSectionInput = {
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageUrl: desktop.url,
    imageFileId: desktop.fileId,
    mobileImageUrl: mobile.url,
    mobileImageFileId: mobile.fileId,
  };

  v.assert();
  return dto;
}
