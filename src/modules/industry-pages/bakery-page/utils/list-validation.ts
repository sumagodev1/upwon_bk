// src/modules/industry-pages/bakery-page/utils/list-validation.ts

import { CONTENT_STATUSES, ContentStatus } from '../../../../config/constants';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from './link';

/**
 * The checks every list section on this page repeats, written once.
 *
 * Same rules as the SFA-DMS proof section's validator, which carries these as
 * private functions - lifted here because this page has five lists that need
 * them rather than two.
 */

const IMAGE_URL_MAX = 1000;

/**
 * Reads one URL / file-id pair.
 *
 * The two can never arrive together. When `required`, exactly one must be
 * present - a row that exists only to show an image is nothing without one.
 * On an update (`partial`), an absent key means "unchanged" rather than
 * "clear", so the result carries `undefined` for it.
 */
export function readImagePair(
  v: Validator,
  fields: { url: string; fileId: string },
  options: { required: boolean; partial: boolean; noun: string },
): { url: string | null | undefined; fileId: string | null | undefined } {
  const url = v.optionalString(fields.url, { max: IMAGE_URL_MAX }) ?? null;
  if (url) validateMediaUrl(v, fields.url, url);
  const fileId = v.optionalUuid(fields.fileId) ?? null;

  v.custom(
    url === null || fileId === null,
    fields.url,
    `Provide either ${fields.url} or ${fields.fileId}, not both`,
    'CONFLICTING_IMAGE_SOURCE',
  );

  if (!options.partial) {
    if (options.required) {
      v.custom(
        url !== null || fileId !== null,
        fields.url,
        `${options.noun} needs an image: give either ${fields.url} or ${fields.fileId}`,
        'REQUIRED',
      );
    }
    return { url, fileId };
  }

  const nextUrl = v.has(fields.url) ? url : undefined;
  const nextFileId = v.has(fields.fileId) ? fileId : undefined;

  /*
   * Clearing both on an update would leave a row the table's image-required
   * check rejects, so say so here rather than surface a constraint violation.
   */
  if (options.required) {
    v.custom(
      !(nextUrl === null && nextFileId === null),
      fields.url,
      `${options.noun} needs an image; replace it rather than removing it`,
      'REQUIRED',
    );
  }

  return { url: nextUrl, fileId: nextFileId };
}

export function validateStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move X to position N" endpoint can when two admins drag at once.
 */
export function validateReorderIds(body: unknown, max: number): { ids: string[] } {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one id', 'REQUIRED');

  // uuidArray dedupes silently, which would turn a duplicated id into a
  // partial reorder. Compare against the raw length to catch it.
  const raw = (body as { ids?: unknown } | null)?.ids;
  v.custom(
    !Array.isArray(raw) || raw.length === ids.length,
    'ids',
    'ids must not contain duplicates',
    'DUPLICATE_IDS',
  );

  v.assert();
  return { ids };
}
