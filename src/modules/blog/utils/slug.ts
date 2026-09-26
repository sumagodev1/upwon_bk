// src/modules/blog/utils/slug.ts

import { slugify, Validator } from '../../../core/utils/validation';

/**
 * The URL-segment format every slug in the schema shares, and the one the
 * blog tables' *_slug_format_check constraints enforce.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Shortest slug a post's author may type. */
const SLUG_MIN = 2;

/**
 * A slug made from free text, capped at `max`. slugify caps at 100 characters,
 * which can land just after a hyphen; the format check allows no trailing one.
 * The column cap may be shorter still. Empty when the text holds no letter or
 * digit at all.
 */
export const deriveBlogSlug = (source: string, max: number): string =>
  slugify(source).slice(0, max).replace(/-+$/, '');

/**
 * The first of `base`, `base-2`, `base-3`... that no row holds, the base
 * trimmed so the suffix still fits the column. For a slug nobody types - a
 * category's, derived from its label - where a collision is not the author's
 * to resolve, so it is numbered away rather than refused. Always returns:
 * `taken` is finite.
 */
export function firstFreeSlug(base: string, taken: ReadonlySet<string>, max: number): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, max - suffix.length).replace(/-+$/, '')}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Reads a post's slug from the body, or derives one from `source` when the
 * caller left it blank - the Insider page's readSlug, with the cap made a
 * parameter.
 *
 * It exists because Validator.slug() is fixed at 100 characters, and a post's
 * slug is its /blog/<slug> URL and may run to 120. The admin editor pre-fills
 * the slug from the title and lets the author edit it; deriving the same way
 * here means a caller that skips the field gets the slug the editor would have
 * suggested, rather than a validation error.
 */
export function readBlogSlug(
  v: Validator,
  source: string,
  max: number,
  field = 'slug',
): string {
  const provided = v.nullableString(field, { min: SLUG_MIN, max });
  if (provided) {
    v.custom(
      SLUG_PATTERN.test(provided),
      field,
      `${field} must be lowercase alphanumeric words separated by hyphens`,
      'INVALID_SLUG',
    );
    return provided;
  }

  const derived = deriveBlogSlug(source, max);
  v.custom(
    derived.length >= SLUG_MIN,
    field,
    `${field} could not be derived from the text given; provide one`,
    'INVALID_SLUG',
  );
  return derived;
}

/**
 * An explicit slug on an update. Unlike on create there is nothing to derive
 * it from - the title may not be in the patch - so a blank one is refused.
 */
export function readRequiredBlogSlug(v: Validator, max: number, field = 'slug'): string {
  const value = v.requiredString(field, { min: SLUG_MIN, max });
  if (value) {
    v.custom(
      SLUG_PATTERN.test(value),
      field,
      `${field} must be lowercase alphanumeric words separated by hyphens`,
      'INVALID_SLUG',
    );
  }
  return value;
}

/**
 * Whether a public route's :slug could name a row at all. A malformed or
 * over-long one is answered with a 404 before any query runs - the same
 * answer an unknown slug gets, so the route says nothing about which is which.
 */
export const isPlausibleSlug = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max && SLUG_PATTERN.test(value);
