// src/modules/home-page/validators/cta-section.validator.ts

import { validator, Validator } from '../../../core/utils/validation';
import { UpsertCtaSectionInput } from '../types/cta-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const BUTTON_LABEL_MAX = 120;

/**
 * An absolute http(s) URL, or a site-relative path like '/images/cta.webp'.
 *
 * Anything else is rejected rather than escaped: this value goes straight into
 * a CSS `url()` on the public site, and the schemes worth blocking there
 * (`javascript:`, `data:`) are exactly the ones a validator can enumerate away.
 */
function validateImageUrl(v: Validator, field: string, value: string): void {
  if (value.startsWith('/')) {
    v.custom(
      !value.startsWith('//'),
      field,
      `${field} must not be protocol-relative; give a full https:// URL instead`,
      'INVALID_IMAGE_URL',
    );
    return;
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }

  v.custom(
    parsed !== null && (parsed.protocol === 'https:' || parsed.protocol === 'http:'),
    field,
    `${field} must be an https:// URL or a site-relative path starting with '/'`,
    'INVALID_IMAGE_URL',
  );
}

export function validateUpsertCtaSection(body: unknown): UpsertCtaSectionInput {
  const v = validator(body);

  const desktopImageUrl = v.optionalString('desktopImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (desktopImageUrl) validateImageUrl(v, 'desktopImageUrl', desktopImageUrl);
  const desktopImageFileId = v.optionalUuid('desktopImageFileId') ?? null;

  // Mirrors home_cta_section_single_desktop_source_check.
  v.custom(
    desktopImageUrl === null || desktopImageFileId === null,
    'desktopImageUrl',
    'Provide either desktopImageUrl or desktopImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const mobileImageUrl = v.optionalString('mobileImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (mobileImageUrl) validateImageUrl(v, 'mobileImageUrl', mobileImageUrl);
  const mobileImageFileId = v.optionalUuid('mobileImageFileId') ?? null;

  // Mirrors home_cta_section_single_mobile_source_check.
  v.custom(
    mobileImageUrl === null || mobileImageFileId === null,
    'mobileImageUrl',
    'Provide either mobileImageUrl or mobileImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpsertCtaSectionInput = {
    desktopImageUrl,
    desktopImageFileId,
    mobileImageUrl,
    mobileImageFileId,
    buttonLabel: v.requiredString('buttonLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    // Upload only: the point of the field is that the report itself is
    // attached, so there is no URL variant to validate against.
    reportFileId: v.optionalUuid('reportFileId') ?? null,
  };

  v.assert();
  return dto;
}
