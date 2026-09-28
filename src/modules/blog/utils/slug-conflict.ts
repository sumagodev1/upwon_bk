// src/modules/blog/utils/slug-conflict.ts

import { ConflictError } from '../../../core/errors/ConflictError';

/**
 * "This slug was just taken" - the one way a blog slug can still collide.
 *
 * No slug is typed: the services derive a new category's or post's slug and
 * number it past every one already held (see firstFreeSlug), so the ordinary
 * case never collides. Only two creates racing for the same free slug can -
 * both read the same set before either writes - and the unique constraint's
 * violation would otherwise surface through DatabaseError's generic
 * DUPLICATE_ENTRY, which names no field and uses a different code from the
 * one the admin panel keys its message on. So a violation of the one
 * constraint the service is guarding is translated into a named 409; saving
 * again then numbers the slug.
 *
 * Kept in this module rather than added to DatabaseError's constraint map
 * because the error carries a field for the panel to highlight, which the
 * generic mapping has no way to express.
 */

/** The SQLSTATE and constraint a slug collision raises. */
const isUniqueViolation = (error: unknown, constraint: string): boolean => {
  const pgError = error as { code?: unknown; constraint?: unknown } | null;
  return pgError?.code === '23505' && pgError.constraint === constraint;
};

export interface SlugConflictSpec {
  /** The unique constraint that guards the column, e.g. blog_posts_slug_key. */
  constraint: string;
  /** The error code the panel keys on, e.g. BLOG_POST_SLUG_TAKEN. */
  code: string;
  /** What the thing is, for the message ('A blog post'). */
  noun: string;
}

export const slugTakenError = (spec: SlugConflictSpec, slug: string): ConflictError =>
  new ConflictError(`${spec.noun} with this slug already exists`, spec.code, [
    {
      field: 'slug',
      message: `The slug '${slug}' was taken by another save at the same moment; save again`,
      code: spec.code,
    },
  ]);

/** Runs a write, turning a race-lost slug collision into that 409. */
export const withSlugConflict = async <T>(
  spec: SlugConflictSpec,
  slug: string | undefined,
  write: () => Promise<T>,
): Promise<T> => {
  try {
    return await write();
  } catch (error) {
    if (slug !== undefined && isUniqueViolation(error, spec.constraint)) {
      throw slugTakenError(spec, slug);
    }
    throw error;
  }
};
