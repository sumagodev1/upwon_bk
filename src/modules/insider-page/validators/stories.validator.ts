// src/modules/insider-page/validators/stories.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import { validateContentUrl } from '../../home-page/utils/content-url';
import {
  CreateInsiderStoryInput,
  ReorderInsiderStoriesInput,
  UpdateInsiderStoryInput,
} from '../types/issues.types';
import { readSlug } from '../utils/slug';

/** Authoring limits, matched against the trimmed text. */
const EYEBROW_MAX = 120;
const CTA_LABEL_MAX = 80;
const TITLE_MAX = 300;
const BLURB_MAX = 1000;
const READ_TIME_MAX = 40;
const IMAGE_URL_MAX = 1000;
const IMAGE_ALT_MAX = 255;
/** The longest seeded article is seven paragraphs; these leave ample room. */
const BODY_MAX_PARAGRAPHS = 60;
const PARAGRAPH_MAX = 5000;
/**
 * A story is an article page of its own at /newsletter/<issue>/<story>, with
 * nothing but the blurb above the body - so an empty body publishes an empty
 * page. One paragraph is the floor.
 */
const BODY_MIN_PARAGRAPHS = 1;

function validateImageUrl(v: Validator, field: string, value: string): void {
  validateContentUrl(v, field, value, 'INVALID_IMAGE_URL');
}

/**
 * The paragraph list a textList produced, against its floor.
 *
 * textList has already trimmed each entry and dropped the blank ones, so a body
 * of [''] or ['   '] arrives here as [] and is refused like an absent one.
 */
function validateBodyParagraphs(v: Validator, paragraphs: string[]): void {
  v.custom(
    paragraphs.length >= BODY_MIN_PARAGRAPHS,
    'body',
    'body must contain at least one paragraph',
    'REQUIRED',
  );
}

export function validateCreateInsiderStory(body: unknown): CreateInsiderStoryInput {
  const v = validator(body);

  const title = v.requiredString('title', { min: 3, max: TITLE_MAX });

  const imageUrl = v.nullableString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateImageUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors insider_stories_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  // An article is required on create: textList gives [] for an absent, null or
  // all-blank body, which validateBodyParagraphs then refuses.
  const paragraphs = v.textList('body', {
    max: BODY_MAX_PARAGRAPHS,
    maxLength: PARAGRAPH_MAX,
  });
  validateBodyParagraphs(v, paragraphs);

  const dto: CreateInsiderStoryInput = {
    // Derived from the title when blank, the way the admin form pre-fills it.
    slug: readSlug(v, title),
    eyebrow: v.requiredString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    ctaLabel: v.requiredString('ctaLabel', { min: 2, max: CTA_LABEL_MAX }),
    title,
    blurb: v.requiredString('blurb', { min: 3, max: BLURB_MAX }),
    imageUrl,
    imageFileId,
    imageAlt: v.nullableString('imageAlt', { max: IMAGE_ALT_MAX }) ?? null,
    readTime: v.nullableString('readTime', { max: READ_TIME_MAX }) ?? null,
    body: paragraphs,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateInsiderStory(body: unknown): UpdateInsiderStoryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'slug',
    'eyebrow',
    'ctaLabel',
    'title',
    'blurb',
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'readTime',
    'body',
    'displayOrder',
    'status',
  ]);

  const imageUrl = v.nullableString('imageUrl', { max: IMAGE_URL_MAX });
  if (imageUrl) validateImageUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.has('imageFileId') ? (v.optionalUuid('imageFileId') ?? null) : undefined;

  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  /*
   * A body is replaced whole, never merged paragraph by paragraph - so a patch
   * that carries one must still leave an article behind. Absent means "leave it
   * alone" and is not checked; present and empty is refused, which is what
   * closes the gap where a saved story could end up with no article at all.
   */
  let paragraphs: string[] | undefined;
  if (v.has('body')) {
    paragraphs = v.textList('body', { max: BODY_MAX_PARAGRAPHS, maxLength: PARAGRAPH_MAX });
    validateBodyParagraphs(v, paragraphs);
  }

  const dto: UpdateInsiderStoryInput = {
    slug: v.has('slug') ? v.slug('slug') : undefined,
    eyebrow: v.optionalString('eyebrow', { min: 2, max: EYEBROW_MAX }),
    ctaLabel: v.optionalString('ctaLabel', { min: 2, max: CTA_LABEL_MAX }),
    title: v.optionalString('title', { min: 3, max: TITLE_MAX }),
    blurb: v.optionalString('blurb', { min: 3, max: BLURB_MAX }),
    imageUrl,
    imageFileId,
    imageAlt: v.nullableString('imageAlt', { max: IMAGE_ALT_MAX }),
    readTime: v.nullableString('readTime', { max: READ_TIME_MAX }),
    body: paragraphs,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateInsiderStoryStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** Every story id of the issue, in its new order - a whole-set rewrite. */
export function validateReorderInsiderStories(body: unknown): ReorderInsiderStoriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_INSIDER_STORIES_PER_ISSUE });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one story id', 'REQUIRED');

  // uuidArray dedupes silently; a duplicated id would become a partial reorder.
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
