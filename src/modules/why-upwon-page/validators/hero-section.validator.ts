// src/modules/why-upwon-page/validators/hero-section.validator.ts

import { validator } from '../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import { UpsertWhyUpwonHeroSectionInput } from '../types/hero-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;
const IMAGE_ALT_MAX = 300;

export function validateUpsertWhyUpwonHeroSection(body: unknown): UpsertWhyUpwonHeroSectionInput {
  const v = validator(body);

  const desktopImageUrl = v.optionalString('desktopImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (desktopImageUrl) validateMediaUrl(v, 'desktopImageUrl', desktopImageUrl);
  const desktopImageFileId = v.optionalUuid('desktopImageFileId') ?? null;

  /*
   * Mirrors why_upwon_hero_section_single_desktop_source_check. Neither is
   * allowed: the site keeps the artwork it ships.
   */
  v.custom(
    desktopImageUrl === null || desktopImageFileId === null,
    'desktopImageUrl',
    'Provide either desktopImageUrl or desktopImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const mobileImageUrl = v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (mobileImageUrl) validateMediaUrl(v, 'mobileImageUrl', mobileImageUrl);
  const mobileImageFileId = v.optionalUuid('mobileImageFileId') ?? null;

  v.custom(
    mobileImageUrl === null || mobileImageFileId === null,
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const primaryHref = v.requiredString('primaryHref', { min: 1, max: BUTTON_HREF_MAX });
  if (primaryHref) validateLinkHref(v, 'primaryHref', primaryHref);

  const secondaryLabel = v.optionalString('secondaryLabel', { max: BUTTON_LABEL_MAX }) ?? null;
  const secondaryHref = v.optionalString('secondaryHref', { max: BUTTON_HREF_MAX }) ?? null;
  if (secondaryHref) validateLinkHref(v, 'secondaryHref', secondaryHref);

  /*
   * Mirrors why_upwon_hero_section_secondary_pair_check. The second button is
   * optional - the hero reads fine with one - but a label with no destination is
   * a dead link, and a destination with no label is invisible.
   */
  v.custom(
    (secondaryLabel === null) === (secondaryHref === null),
    'secondaryLabel',
    'Give the second button both a label and a destination, or leave both empty',
    'INCOMPLETE_BUTTON',
  );

  const dto: UpsertWhyUpwonHeroSectionInput = {
    desktopImageUrl,
    desktopImageFileId,
    mobileImageUrl,
    mobileImageFileId,
    // Required even though the image is optional: whichever artwork is shown -
    // the uploaded one or the site's own - it is the page's first content, so
    // it always needs describing.
    imageAlt: v.requiredString('imageAlt', { min: 3, max: IMAGE_ALT_MAX }),
    // The first button is required: the hero is where a visitor decides where
    // to go next.
    primaryLabel: v.requiredString('primaryLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    primaryHref,
    secondaryLabel,
    secondaryHref,
  };

  v.assert();
  return dto;
}
