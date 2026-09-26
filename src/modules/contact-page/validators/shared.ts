// src/modules/contact-page/validators/shared.ts

import { Validator } from '../../../core/utils/validation';
import { validateContentUrl } from '../../home-page/utils/content-url';
import { hasBalancedAccentMarkers } from '../../home-page/utils/heading-markup';

/**
 * The checks more than one Contact section needs, in one place so the wording
 * an admin sees is identical wherever the same mistake is made.
 */

/** Authoring limits shared by the sections that use them. */
export const HEADING_MAX = 300;
export const SUBTEXT_MAX = 600;
export const IMAGE_URL_MAX = 1000;

/** The same check, and the same message, as the home hero heading. */
export function validateHeadingMarkup(v: Validator, field: string, value: string): void {
  v.custom(
    hasBalancedAccentMarkers(value),
    field,
    `${field} has an unclosed ** accent marker; wrap accented words as **like this**`,
    'UNBALANCED_ACCENT_MARKER',
  );
}

/**
 * One image slot's pair of sources, read and checked together.
 *
 * Both are optional - a section with neither renders on its own background -
 * but setting both is refused here as a field error rather than left to the
 * table's single_image_source CHECK, which can only fail the whole write.
 *
 * There is deliberately no "paste an image URL" input in the admin panel; a
 * stored URL still round-trips through this so seeded paths survive a save
 * that did not touch the image.
 */
export function readImagePair(
  v: Validator,
  urlField: string,
  fileIdField: string,
): { url: string | null; fileId: string | null } {
  const url = v.nullableString(urlField, { max: IMAGE_URL_MAX }) ?? null;
  if (url) validateContentUrl(v, urlField, url, 'INVALID_IMAGE_URL');

  const fileId = v.optionalUuid(fileIdField) ?? null;

  v.custom(
    url === null || fileId === null,
    urlField,
    `Provide either ${urlField} or ${fileIdField}, not both`,
    'CONFLICTING_IMAGE_SOURCE',
  );

  return { url, fileId };
}

/**
 * An ordered list of choices the visitor picks from, required to hold at least
 * one entry.
 *
 * textList already trims entries and drops blank ones, so the empty row an
 * editor leaves behind never saves - which is also why the minimum is checked
 * after it rather than on the raw array.
 */
export function requiredTextList(
  v: Validator,
  field: string,
  label: string,
  opts: { max: number; maxLength: number },
): string[] {
  const entries = v.textList(field, opts);
  v.custom(entries.length > 0, field, `Add at least one ${label}`, 'REQUIRED');
  return entries;
}
