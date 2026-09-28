// src/modules/product-pages/vendor-portal-page/validators/cta-section.validator.ts

import { validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import { UpsertVmsCtaSectionInput } from '../types/cta-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 120;
const HREF_MAX = 500;
const IMAGE_URL_MAX = 1000;

/**
 * The band is written whole rather than patched.
 *
 * It is a singleton with eight fields an editor sees on one screen, so a save
 * is the whole screen. That also means a field left out is a field cleared,
 * which is why the optional halves read as nullable rather than absent.
 */
export function validateUpsertVmsCtaSection(body: unknown): UpsertVmsCtaSectionInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  const mobileImageUrl = v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (mobileImageUrl) validateMediaUrl(v, 'mobileImageUrl', mobileImageUrl);
  const mobileImageFileId = v.optionalUuid('mobileImageFileId') ?? null;

  // Mirrors the two single-source CHECKs: a slot holds a path or an upload,
  // never both, because the site would have to guess which to draw.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    mobileImageUrl === null || mobileImageFileId === null,
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const primaryHref = v.requiredString('primaryHref', { min: 1, max: HREF_MAX });
  if (primaryHref) validateLinkHref(v, 'primaryHref', primaryHref);

  const secondaryLabel = v.optionalString('secondaryLabel', { max: LABEL_MAX }) ?? null;
  const secondaryHref = v.optionalString('secondaryHref', { max: HREF_MAX }) ?? null;
  if (secondaryHref) validateLinkHref(v, 'secondaryHref', secondaryHref);

  /*
   * Mirrors vms_cta_section_secondary_pair_check: the second button is both
   * halves or neither. A label with no destination is a dead button, and a
   * destination with no label is invisible.
   */
  v.custom(
    (secondaryLabel === null) === (secondaryHref === null),
    'secondaryLabel',
    'The second button needs both a label and a destination, or neither',
    'INCOMPLETE_PAIR',
  );

  const dto: UpsertVmsCtaSectionInput = {
    imageUrl,
    imageFileId,
    mobileImageUrl,
    mobileImageFileId,
    // The first button is required: the band exists to be clicked.
    primaryLabel: v.requiredString('primaryLabel', { min: 2, max: LABEL_MAX }),
    primaryHref,
    secondaryLabel,
    secondaryHref,
  };

  v.assert();
  return dto;
}
