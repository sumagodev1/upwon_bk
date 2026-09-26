// src/modules/blog/validators/posts.validator.ts

import { CONTENT_STATUSES } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import {
  BlogPostFilters,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from '../types/posts.types';
import { readBlogSlug, readRequiredBlogSlug } from '../utils/slug';
import { rawField, readBodyBlocks } from './shared';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin editor's counters are written against and the ones 049_blog.sql sizes
 * its columns to. Changing one means changing all three.
 *
 * The body's own limits live in shared.ts, beside the readers that apply them.
 */
const SLUG_MAX = 120;
const TITLE_MIN = 3;
const TITLE_MAX = 200;
const EXCERPT_MIN = 3;
const EXCERPT_MAX = 400;
const READ_TIME_MAX = 40;
const AUTHOR_MIN = 2;
const AUTHOR_MAX = 120;
const LEAD_MIN = 3;
const LEAD_MAX = 1000;

/** 'YYYY-MM-DD' and nothing else - no time, no zone, no other order. */
const DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The publish date: a calendar date, exactly as the card prints it.
 *
 * Read as text and checked by hand rather than with requiredDate, which would
 * accept any string Date can parse - '2026-05-28T23:00:00-05:00' is a
 * different day depending on where it is read, and '2026-02-30' rolls over into
 * March. A post is "from 28 May", so only a real YYYY-MM-DD is taken, and it is
 * stored and returned as the same ten characters.
 */
function readPublishedOn(v: Validator): string {
  const value = v.requiredString('publishedOn', { max: 10 });
  if (!value) return value;

  const match = DATE_SHAPE.exec(value);
  let valid = false;
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    valid =
      year >= 1900 &&
      year <= 9999 &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  }

  v.custom(valid, 'publishedOn', 'publishedOn must be a real date as YYYY-MM-DD', 'INVALID_DATE');
  return value;
}

/**
 * One of the post's two crops - 'imageFileId' (desktop) or 'mobileImageFileId'
 * (the optional phone crop): an upload only. There is no URL source for
 * either - these ids are the only fields that set a picture, and an imageUrl or
 * mobileImageUrl a client still sends is ignored like any other unknown key
 * (the validators here never refuse extra keys). null, or '' - read as a
 * nullable string first, the way readImagePair reads every CMS file id - means
 * "no picture". A phone crop without a desktop picture is refused by the
 * service, which alone knows what a partial edit leaves stored.
 */
function readImageFileId(
  v: Validator,
  field: 'imageFileId' | 'mobileImageFileId',
): string | null {
  return v.nullableString(field) ? v.requiredUuid(field) : null;
}

export function validateCreateBlogPost(body: unknown): CreateBlogPostInput {
  const v = validator(body);

  const title = v.requiredString('title', { min: TITLE_MIN, max: TITLE_MAX });

  // An article is required on create: an absent, empty or malformed body is
  // refused with the offending block's index in the message.
  const blocks = readBodyBlocks(v, rawField(body, 'body'));

  const dto: CreateBlogPostInput = {
    // Derived from the title when blank, the way the admin editor pre-fills it.
    slug: readBlogSlug(v, title, SLUG_MAX),
    categoryId: v.requiredUuid('categoryId'),
    title,
    excerpt: v.requiredString('excerpt', { min: EXCERPT_MIN, max: EXCERPT_MAX }),
    // Optional - a card without a picture renders on its own background.
    imageFileId: readImageFileId(v, 'imageFileId'),
    mobileImageFileId: readImageFileId(v, 'mobileImageFileId'),
    readTime: v.nullableString('readTime', { max: READ_TIME_MAX }) ?? null,
    publishedOn: readPublishedOn(v),
    author: v.requiredString('author', { min: AUTHOR_MIN, max: AUTHOR_MAX }),
    lead: v.requiredString('lead', { min: LEAD_MIN, max: LEAD_MAX }),
    body: blocks,
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * A partial edit of one post: an absent field is left alone, and `null` clears
 * the nullable ones. The editor sends every field on every save, which this
 * reads exactly as a full replace; a caller that only flips one field (a
 * script, a quick fix) need not resend the article.
 */
export function validateUpdateBlogPost(body: unknown): UpdateBlogPostInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'slug',
    'categoryId',
    'title',
    'excerpt',
    'imageFileId',
    'mobileImageFileId',
    'readTime',
    'publishedOn',
    'author',
    'lead',
    'body',
    'status',
  ]);

  /*
   * A body is replaced whole, never merged block by block - so a patch that
   * carries one must still leave an article behind. Absent means "leave it
   * alone"; present and empty is refused.
   */
  const blocks = v.has('body') ? readBodyBlocks(v, rawField(body, 'body')) : undefined;

  const dto: UpdateBlogPostInput = {
    slug: v.has('slug') ? readRequiredBlogSlug(v, SLUG_MAX) : undefined,
    categoryId: v.has('categoryId') ? v.requiredUuid('categoryId') : undefined,
    title: v.has('title')
      ? v.requiredString('title', { min: TITLE_MIN, max: TITLE_MAX })
      : undefined,
    excerpt: v.has('excerpt')
      ? v.requiredString('excerpt', { min: EXCERPT_MIN, max: EXCERPT_MAX })
      : undefined,
    /*
     * Absent leaves the picture alone; an upload or null replaces it - and
     * either one also clears a seeded post's legacy image URL (the repository
     * does that), so the first upload, or Remove, retires the seeded picture.
     * The phone crop is its own column and nothing else touches it.
     */
    imageFileId: v.has('imageFileId') ? readImageFileId(v, 'imageFileId') : undefined,
    mobileImageFileId: v.has('mobileImageFileId')
      ? readImageFileId(v, 'mobileImageFileId')
      : undefined,
    readTime: v.nullableString('readTime', { max: READ_TIME_MAX }),
    publishedOn: v.has('publishedOn') ? readPublishedOn(v) : undefined,
    author: v.has('author')
      ? v.requiredString('author', { min: AUTHOR_MIN, max: AUTHOR_MAX })
      : undefined,
    lead: v.has('lead') ? v.requiredString('lead', { min: LEAD_MIN, max: LEAD_MAX }) : undefined,
    body: blocks,
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Publish / unpublish, kept separate from the editor's save. */
export function validateBlogPostStatus(body: unknown): { status: 'ACTIVE' | 'INACTIVE' } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * The admin list: a search box, a category filter and a status filter.
 *
 * No paging - the list returns every matching post, newest first, as a plain
 * array like every CMS list in this API (the Insider stories and the Careers
 * vacancies are unpaged too). The set is bounded by LIMITS.MAX_BLOG_POSTS. A
 * `page` or `limit` a client sends is ignored rather than refused.
 */
export function validateBlogPostListQuery(query: Record<string, unknown>): BlogPostFilters {
  const v = validator(query);
  // Three filters, each of which a filter bar may send as '' for "any" - read
  // as absent rather than answered with a REQUIRED error.
  const filters: BlogPostFilters = {
    status: v.nullableString('status') ? v.requiredEnum('status', CONTENT_STATUSES) : undefined,
    categoryId: v.nullableString('categoryId') ? v.requiredUuid('categoryId') : undefined,
    search: v.nullableString('search', { max: 120 }) ?? undefined,
  };
  v.assert();
  return filters;
}
