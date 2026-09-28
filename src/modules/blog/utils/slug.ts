// src/modules/blog/utils/slug.ts

import { slugify } from '../../../core/utils/validation';

/**
 * The URL-segment format every slug in the schema shares, and the one the
 * blog tables' *_slug_format_check constraints enforce.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
 * category's, derived from its label, or a post's, derived from its title -
 * where a collision is not the author's to resolve, so it is numbered away
 * rather than refused. Always returns: `taken` is finite.
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
 * Whether a public route's :slug could name a row at all. A malformed or
 * over-long one is answered with a 404 before any query runs - the same
 * answer an unknown slug gets, so the route says nothing about which is which.
 */
export const isPlausibleSlug = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max && SLUG_PATTERN.test(value);
