// src/modules/product-pages/erp-page/validators/cta-section.validator.ts

import { validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import { UpsertErpCtaSectionInput } from '../types/cta-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;

export function validateUpsertErpCtaSection(body: unknown): UpsertErpCtaSectionInput {
  const v = validator(body);

  const desktopImageUrl = v.optionalString('desktopImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (desktopImageUrl) validateMediaUrl(v, 'desktopImageUrl', desktopImageUrl);
  const desktopImageFileId = v.optionalUuid('desktopImageFileId') ?? null;

  // Mirrors erp_cta_section_single_desktop_source_check.
  v.custom(
    desktopImageUrl === null || desktopImageFileId === null,
    'desktopImageUrl',
    'Provide either desktopImageUrl or desktopImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const mobileImageUrl = v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (mobileImageUrl) validateMediaUrl(v, 'mobileImageUrl', mobileImageUrl);
  const mobileImageFileId = v.optionalUuid('mobileImageFileId') ?? null;

  // Mirrors erp_cta_section_single_mobile_source_check.
  v.custom(
    mobileImageUrl === null || mobileImageFileId === null,
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const buttonHref = v.requiredString('buttonHref', { min: 1, max: BUTTON_HREF_MAX });
  if (buttonHref) validateLinkHref(v, 'buttonHref', buttonHref);

  const dto: UpsertErpCtaSectionInput = {
    desktopImageUrl,
    desktopImageFileId,
    mobileImageUrl,
    mobileImageFileId,
    buttonLabel: v.requiredString('buttonLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    buttonHref,
  };

  v.assert();
  return dto;
}
