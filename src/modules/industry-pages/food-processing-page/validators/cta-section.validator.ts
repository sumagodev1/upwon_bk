// src/modules/industry-pages/food-processing-page/validators/cta-section.validator.ts

import { validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import { UpsertFoodProcessingCtaSectionInput } from '../types/cta-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;

// ── the band ──────────────────────────────────────────────────────────────

export function validateUpsertFoodProcessingCtaSection(body: unknown): UpsertFoodProcessingCtaSectionInput {
  const v = validator(body);

  const desktopImageUrl = v.optionalString('desktopImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (desktopImageUrl) validateMediaUrl(v, 'desktopImageUrl', desktopImageUrl);
  const desktopImageFileId = v.optionalUuid('desktopImageFileId') ?? null;

  /*
   * Mirrors food_processing_cta_section_single_desktop_source_check. Neither is allowed:
   * the band falls back to its light ground, which is a working design.
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

  // Mirrors food_processing_cta_section_secondary_pair_check.
  v.custom(
    (secondaryLabel === null) === (secondaryHref === null),
    'secondaryLabel',
    'Give the second button both a label and a destination, or leave both empty',
    'INCOMPLETE_BUTTON',
  );

  const dto: UpsertFoodProcessingCtaSectionInput = {
    desktopImageUrl,
    desktopImageFileId,
    mobileImageUrl,
    mobileImageFileId,
    // The first button is required: a closing band with no way to act on it is
    // the one section on the page that has nothing else to offer.
    primaryLabel: v.requiredString('primaryLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    primaryHref,
    secondaryLabel,
    secondaryHref,
  };

  v.assert();
  return dto;
}
