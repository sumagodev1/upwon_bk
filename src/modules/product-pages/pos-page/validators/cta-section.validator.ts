// src/modules/product-pages/pos-page/validators/cta-section.validator.ts

import { validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import { UpsertPosCtaSectionInput } from '../types/cta-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;
const NOTE_MAX = 160;
const FOOTNOTE_MAX = 300;

/**
 * Reads a genuinely optional line of text, where blank means "there isn't one".
 *
 * `optionalString` treats a whitespace-only value as a missing required one and
 * fails with "<field> is required", which on a field the band renders perfectly
 * well without is both wrong and confusing. Here a blank collapses to null -
 * the same thing the admin form sends when the box is cleared - so the CHECK
 * never sees an empty string and nobody is told an optional field is required.
 */
function optionalLine(
  v: ReturnType<typeof validator>,
  body: unknown,
  field: string,
  max: number,
): string | null {
  const raw = (body as Record<string, unknown> | null)?.[field];
  if (typeof raw === 'string' && raw.trim() === '') return null;
  return v.optionalString(field, { max }) ?? null;
}

export function validateUpsertPosCtaSection(body: unknown): UpsertPosCtaSectionInput {
  const v = validator(body);

  const desktopImageUrl = v.optionalString('desktopImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (desktopImageUrl) validateMediaUrl(v, 'desktopImageUrl', desktopImageUrl);
  const desktopImageFileId = v.optionalUuid('desktopImageFileId') ?? null;

  /*
   * Mirrors pos_cta_section_single_desktop_source_check. Neither is allowed:
   * the band falls back to its cream ground, which is a working design.
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
   * Mirrors pos_cta_section_secondary_pair_check. The second button is optional
   * - the band reads fine with one - but a label with no destination is a dead
   * link, and a destination with no label is invisible.
   */
  v.custom(
    (secondaryLabel === null) === (secondaryHref === null),
    'secondaryLabel',
    'Give the second button both a label and a destination, or leave both empty',
    'INCOMPLETE_BUTTON',
  );

  const dto: UpsertPosCtaSectionInput = {
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
    footnote: optionalLine(v, body, 'footnote', FOOTNOTE_MAX),
    /*
     * Optional: the note is only drawn from 1024px up, so a band without one
     * is a design choice rather than a hole.
     */
    note: optionalLine(v, body, 'note', NOTE_MAX),
  };

  v.assert();
  return dto;
}
