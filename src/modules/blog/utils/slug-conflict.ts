// src/modules/blog/utils/slug-conflict.ts

import { ConflictError } from '../../../core/errors/ConflictError';
import { Executor } from '../../../config/database';

/**
 * "This slug is taken", answered the same way whichever of the two paths finds
 * it first.
 *
 * The services check before they write, so the ordinary case is a clean 409
 * naming the field. The unique constraint is what makes the rule true under
 * concurrency - two saves of the same new slug can both pass the check - and
 * its violation would otherwise surface through DatabaseError's generic
 * DUPLICATE_ENTRY, which names no field and uses a different code from the
 * one the admin panel keys its message on. So a violation of the one
 * constraint the service is guarding is translated back into the same error.
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
      message: `The slug '${slug}' is already in use; choose another`,
      code: spec.code,
    },
  ]);

/**
 * Refuses a slug another row already holds. `selfId` is the row being edited,
 * which may of course keep its own slug.
 */
export const assertSlugAvailable = async (
  spec: SlugConflictSpec,
  slug: string,
  selfId: string | null,
  findIdBySlug: (slug: string, executor?: Executor) => Promise<string | null>,
  executor: Executor,
): Promise<void> => {
  const holder = await findIdBySlug(slug, executor);
  if (holder && holder !== selfId) throw slugTakenError(spec, slug);
};

/** Runs a write, turning a race-lost slug collision into the same 409. */
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
