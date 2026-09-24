// src/modules/product-pages/sfa-dms-page/validators/cta-section.validator.ts

import { validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import { UpsertSfaCtaSectionInput } from '../types/cta-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;

export function validateUpsertSfaCtaSection(body: unknown): UpsertSfaCtaSectionInput {
  const v = validator(body);

  const backgroundImageUrl =
    v.optionalString('backgroundImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (backgroundImageUrl) validateMediaUrl(v, 'backgroundImageUrl', backgroundImageUrl);
  const backgroundImageFileId = v.optionalUuid('backgroundImageFileId') ?? null;

  // Mirrors sfa_cta_section_single_background_source_check. Neither is allowed:
  // the band falls back to its navy ground, which is a working design.
  v.custom(
    backgroundImageUrl === null || backgroundImageFileId === null,
    'backgroundImageUrl',
    'Provide either backgroundImageUrl or backgroundImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dashboardImageUrl =
    v.optionalString('dashboardImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (dashboardImageUrl) validateMediaUrl(v, 'dashboardImageUrl', dashboardImageUrl);
  const dashboardImageFileId = v.optionalUuid('dashboardImageFileId') ?? null;

  v.custom(
    dashboardImageUrl === null || dashboardImageFileId === null,
    'dashboardImageUrl',
    'Provide either dashboardImageUrl or dashboardImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const buttonHref = v.requiredString('buttonHref', { min: 1, max: BUTTON_HREF_MAX });
  if (buttonHref) validateLinkHref(v, 'buttonHref', buttonHref);

  const dto: UpsertSfaCtaSectionInput = {
    backgroundImageUrl,
    backgroundImageFileId,
    dashboardImageUrl,
    dashboardImageFileId,
    dashboardAlt: v.optionalString('dashboardAlt', { max: ALT_MAX }) ?? null,
    buttonLabel: v.requiredString('buttonLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    buttonHref,
  };

  v.assert();
  return dto;
}
