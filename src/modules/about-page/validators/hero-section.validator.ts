// src/modules/about-page/validators/hero-section.validator.ts

import { LIMITS } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import { validateContentUrl } from '../../home-page/utils/content-url';
import { AboutHeroBackdrop, ReplaceAboutHeroSectionInput } from '../types/hero-section.types';
import {
  EYEBROW_MAX,
  HEADING_MAX,
  IMAGE_URL_MAX,
  SUBTEXT_MAX,
  validateHeadingMarkup,
} from './shared';

/**
 * Mirrors core/utils/validation.ts's UUID_PATTERN, which is private to that
 * module. Needed here because the backdrop ids arrive inside array entries, and
 * Validator's uuid helpers read a named top-level field - a per-entry error has
 * to be reported as 'backdrops[1].imageFileId' or the admin form cannot put the
 * message under the right slot.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * One crop's pair of sources inside one backdrop entry, read and checked
 * together - the desktop pair (imageUrl / imageFileId) or the phone pair
 * (mobileImageUrl / mobileImageFileId).
 *
 * The same rules as validators/shared.ts's readImagePair, applied to keys inside
 * an array entry instead of to top-level fields: every error names
 * 'backdrops[1].mobileImageUrl' so the admin form can put the message under the
 * slot the editor is looking at, which is the whole reason this file parses the
 * array by hand.
 *
 * `blank` distinguishes "this crop was not given" from "this crop was given and
 * is wrong": a crop whose url failed validateContentUrl still counts as given,
 * so a bad URL is never mistaken for an empty slot.
 */
function readEntryImagePair(
  v: Validator,
  entry: Record<string, unknown>,
  index: number,
  urlKey: 'imageUrl' | 'mobileImageUrl',
  fileIdKey: 'imageFileId' | 'mobileImageFileId',
): { url: string | null; fileId: string | null; blank: boolean } {
  const rawUrl = entry[urlKey];
  const rawFileId = entry[fileIdKey];

  const urlText = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  const fileIdText = typeof rawFileId === 'string' ? rawFileId.trim() : '';

  if (urlText === '' && fileIdText === '') return { url: null, fileId: null, blank: true };

  const urlField = `backdrops[${index}].${urlKey}`;
  const fileIdField = `backdrops[${index}].${fileIdKey}`;

  let url: string | null = null;
  if (urlText !== '') {
    if (urlText.length > IMAGE_URL_MAX) {
      v.custom(
        false,
        urlField,
        `Image URL must be at most ${IMAGE_URL_MAX} characters`,
        'TOO_LONG',
      );
    } else {
      validateContentUrl(v, urlField, urlText, 'INVALID_IMAGE_URL');
    }
    url = urlText;
  }

  let fileId: string | null = null;
  if (fileIdText !== '') {
    if (!UUID_PATTERN.test(fileIdText)) {
      v.custom(false, fileIdField, `${fileIdField} must be a valid UUID`, 'INVALID_UUID');
    } else {
      fileId = fileIdText;
    }
  }

  v.custom(
    url === null || fileId === null,
    urlField,
    `Provide either ${urlKey} or ${fileIdKey} for a backdrop, not both`,
    'CONFLICTING_IMAGE_SOURCE',
  );

  return { url, fileId, blank: false };
}

/**
 * The rotating backdrops, in order - each one a desktop crop and an optional
 * phone crop of the same photograph.
 *
 * Read off the raw body rather than through a Validator helper because there is
 * none for an array of objects, and the per-entry errors have to name the slot
 * that is wrong - contact_details_section's offices are parsed the same way for
 * the same reason.
 *
 * An entry with no source at all is dropped rather than rejected: that is the
 * empty slot an editor leaves behind after removing a photograph, and a slide
 * with no picture is not something to save. An entry with BOTH sources for the
 * same crop is reported, because it is a client bug rather than an editing
 * accident and the CHECK behind it can only fail the whole write with no slot
 * named.
 *
 * An entry with a phone crop and NO desktop image is reported too, which is the
 * one rule that differs from the Contact and Partner heroes. There the two slots
 * are independent and "no desktop image" is a publishable state - the section
 * renders on its own background. Here the entry exists only because of its
 * photograph: the fallback runs one way, so such a slide would draw nothing above
 * the breakpoint, and the public read drops an entry with no desktop image
 * entirely - which would throw the editor's upload away without saying so. Better
 * to say so.
 *
 * An empty list is legal: the hero then renders on the plain navy ground the
 * slider falls back to.
 */
function parseBackdrops(v: Validator, body: unknown): AboutHeroBackdrop[] {
  const raw = (body as { backdrops?: unknown } | null)?.backdrops;

  // Absent means "no backdrops", not an error: the form posts an empty array,
  // and a client that omits the key entirely means the same thing.
  if (raw === undefined || raw === null) return [];

  if (!Array.isArray(raw)) {
    v.custom(false, 'backdrops', 'backdrops must be an array', 'INVALID_TYPE');
    return [];
  }
  if (raw.length > LIMITS.MAX_ABOUT_HERO_BACKDROPS) {
    v.custom(
      false,
      'backdrops',
      `backdrops may contain at most ${LIMITS.MAX_ABOUT_HERO_BACKDROPS} images`,
      'TOO_MANY',
    );
    return [];
  }

  const backdrops: AboutHeroBackdrop[] = [];

  raw.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      v.custom(
        false,
        `backdrops[${index}]`,
        'Each backdrop must be an object',
        'INVALID_TYPE',
      );
      return;
    }

    const fields = entry as Record<string, unknown>;

    const desktop = readEntryImagePair(v, fields, index, 'imageUrl', 'imageFileId');
    const mobile = readEntryImagePair(
      v,
      fields,
      index,
      'mobileImageUrl',
      'mobileImageFileId',
    );

    // The empty slot an editor leaves behind: neither crop given.
    if (desktop.blank && mobile.blank) return;

    if (desktop.blank) {
      v.custom(
        false,
        `backdrops[${index}].imageUrl`,
        'This backdrop has a mobile image but no main image. Upload the main image, or clear the mobile one - the mobile crop is only used in place of it on narrow screens.',
        'MOBILE_IMAGE_WITHOUT_IMAGE',
      );
      return;
    }

    backdrops.push({
      imageUrl: desktop.url,
      imageFileId: desktop.fileId,
      mobileImageUrl: mobile.url,
      mobileImageFileId: mobile.fileId,
    });
  });

  return backdrops;
}

/**
 * PUT is a full replace of the singleton: every field is read, and an absent
 * nullable field is stored as null. There is no merge, because the admin form
 * always sends the whole section and a merge would let a stale field survive a
 * save that meant to clear it.
 */
export function validateReplaceAboutHeroSection(body: unknown): ReplaceAboutHeroSectionInput {
  const v = validator(body);

  const heading = v.requiredString('heading', { min: 3, max: HEADING_MAX });
  if (heading) validateHeadingMarkup(v, 'heading', heading);

  const dto: ReplaceAboutHeroSectionInput = {
    eyebrow: v.requiredString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    heading,
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    backdrops: parseBackdrops(v, body),
  };

  v.assert();
  return dto;
}
