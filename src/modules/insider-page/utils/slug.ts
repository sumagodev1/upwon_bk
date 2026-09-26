// src/modules/insider-page/utils/slug.ts

import { slugify, Validator } from '../../../core/utils/validation';

/**
 * Reads a URL slug from the body, or derives one from `source` when the caller
 * left it blank.
 *
 * Issue and story slugs become /newsletter URL segments. The admin form
 * pre-fills the slug from the label/title and lets the author edit it; deriving
 * the same way here means a caller that skips the field gets the slug the form
 * would have suggested, rather than a validation error.
 */
export function readSlug(v: Validator, source: string, field = 'slug'): string {
  const provided = v.nullableString(field);
  if (provided) return v.slug(field);

  // slugify caps at 100 characters, which can land just after a hyphen; the
  // format check allows no trailing one.
  const derived = slugify(source).replace(/-+$/, '');
  v.custom(
    derived.length >= 2,
    field,
    `${field} could not be derived from the text given; provide one`,
    'INVALID_SLUG',
  );
  return derived;
}
