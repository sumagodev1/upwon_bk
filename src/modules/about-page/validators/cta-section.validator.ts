// src/modules/about-page/validators/cta-section.validator.ts

import { validator } from '../../../core/utils/validation';
import { ReplaceAboutCtaSectionInput } from '../types/cta-section.types';
import { HEADING_MAX, SUBTEXT_MAX, readImagePair, validateHeadingMarkup } from './shared';

/**
 * PUT is a full replace of the singleton: every field is read, and an absent
 * nullable field is stored as null.
 *
 * No eyebrow, unlike the other three copy sections: this banner has never had
 * one, so there is no field to read and none to validate.
 */
export function validateReplaceAboutCtaSection(body: unknown): ReplaceAboutCtaSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeadingMarkup(v, 'heading', heading);

  /*
   * Two image slots - the wide banner and the narrow layout's portrait crop -
   * each read as its own pair by the same shared helper, so both behave
   * identically and an admin who makes the same mistake in either slot is told
   * the same thing about the field they are actually looking at.
   *
   * All four are optional, and the two slots are INDEPENDENT: a banner with a
   * phone crop and no wide image is legal, exactly as it is on the Partner hero,
   * and so is the reverse. That is deliberately NOT the About hero's rule, where
   * a backdrop entry carrying a mobile crop and no desktop image is refused -
   * there the entry exists only because of its photograph, the fallback runs one
   * way, and such a slide would draw nothing above the breakpoint. Here neither
   * layout can end up empty: <AboutCtaSection> renders two separate blocks and
   * each falls back to its own built-in artwork, so an unset slot means "keep the
   * house picture for that layout" rather than "render a card with no artwork".
   * Refusing the save would only stop an admin publishing the phone crop first.
   */
  const image = readImagePair(v, 'imageUrl', 'imageFileId');
  const mobileImage = readImagePair(v, 'mobileImageUrl', 'mobileImageFileId');

  const dto: ReplaceAboutCtaSectionInput = {
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    imageUrl: image.url,
    imageFileId: image.fileId,
    mobileImageUrl: mobileImage.url,
    mobileImageFileId: mobileImage.fileId,
  };

  v.assert();
  return dto;
}
