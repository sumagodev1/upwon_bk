// src/modules/home-page/utils/image-pair.ts

import { Validator } from '../../../core/utils/validation';
import { validateContentUrl } from './content-url';

/**
 * One image slot's pair of sources, read and checked together - the rule every
 * CMS image slot in the panel is stored under.
 *
 * It lives here, beside content-url.ts and image-asset.ts, because more than one
 * module needs it and a copy per module is how the rule drifts: the About page's
 * four slots, the About hero's per-backdrop crops and the Partner Program hero's
 * desktop/mobile pair all have to agree about what a blank means, and each new
 * pair of slots is another chance for one of them not to.
 *
 * Both halves are optional - a section with neither renders on its own
 * background - but setting both is refused here as a field error rather than left
 * to the table's single_..._source CHECK, which can only fail the whole write
 * with no field named.
 *
 * The file id is read as a nullable string rather than with optionalUuid so both
 * halves of the pair agree about what a blank means. Every PUT in this CMS is a
 * full replace: every client sends every key on every save, and one that builds
 * the body from empty-string defaults means "no image" by '' exactly as the url
 * does. optionalUuid counts only an absent or null key as "not given", so ''
 * would fall through to requiredUuid and come back as a REQUIRED error on an
 * optional field. A value that is really there is still checked as a UUID.
 *
 * There is deliberately no "paste an image URL" input in the admin panel; a
 * stored URL still round-trips through this so a seeded path survives a save that
 * did not touch the image.
 *
 * NOT yet shared with contact-page/validators/shared.ts, which keeps its own copy
 * reading the file id with optionalUuid - so a '' file id is answered there with
 * a REQUIRED error on an optional field. That is a pre-existing bug in the
 * Contact hero rather than a new one, and fixing it means changing a section this
 * change was told to leave alone; it is reported separately.
 */

/**
 * The column cap every image URL is validated against (VARCHAR(1000) on every
 * table that stores one, and IMAGE_URL_MAX in the admin panel's lib/imageSlot).
 */
export const IMAGE_URL_MAX = 1000;

export function readImagePair(
  v: Validator,
  urlField: string,
  fileIdField: string,
): { url: string | null; fileId: string | null } {
  const url = v.nullableString(urlField, { max: IMAGE_URL_MAX }) ?? null;
  if (url) validateContentUrl(v, urlField, url, 'INVALID_IMAGE_URL');

  const raw = v.nullableString(fileIdField);
  const fileId = raw ? v.requiredUuid(fileIdField) : null;

  v.custom(
    url === null || fileId === null,
    urlField,
    `Provide either ${urlField} or ${fileIdField}, not both`,
    'CONFLICTING_IMAGE_SOURCE',
  );

  return { url, fileId };
}
