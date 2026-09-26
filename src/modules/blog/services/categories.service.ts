// src/modules/blog/services/categories.service.ts

import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as categoriesRepository from '../repositories/categories.repository';
import {
  BlogCategory,
  BlogCategoryFilters,
  BlogCategorySummary,
  CreateBlogCategoryInput,
  UpdateBlogCategoryInput,
} from '../types/categories.types';
import { SlugConflictSpec, withSlugConflict } from '../utils/slug-conflict';
import { deriveBlogSlug, firstFreeSlug } from '../utils/slug';

const MODULE = 'blog';
const ENTITY = 'blog_category';

const SLUG_CONFLICT: SlugConflictSpec = {
  constraint: 'blog_categories_slug_key',
  code: 'BLOG_CATEGORY_SLUG_TAKEN',
  noun: 'A blog category',
};

/** blog_categories.slug's column size: a short key, not a URL. */
const SLUG_MAX = 60;

/** The key of a category whose label holds no letter or digit ('&&'). */
const FALLBACK_SLUG = 'category';

/** The whole row, so a deleted category is recoverable from the trail. */
const auditSnapshot = (category: BlogCategory): Record<string, unknown> => ({
  slug: category.slug,
  label: category.label,
  icon: category.icon,
  status: category.status,
  displayOrder: category.displayOrder,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (filters: BlogCategoryFilters): Promise<BlogCategorySummary[]> =>
  categoriesRepository.findAll(filters);

export const getById = async (id: string): Promise<BlogCategorySummary> => {
  const category = await categoriesRepository.findById(id);
  if (!category) throw new NotFoundError('Blog category');
  return category;
};

// ── writes ────────────────────────────────────────────────────────────────

/**
 * A new category's slug is not an input: it is derived from the label - 'Food
 * Manufacturing & ERP' -> 'food-manufacturing-erp' - and, since the author
 * cannot choose another, a label whose slug is already held is numbered
 * ('-2', '-3'...) rather than refused. It never changes afterwards; update()
 * has no slug to write. Only a race between two creates of the same label can
 * still meet the unique constraint, which withSlugConflict answers with the
 * usual 409 - saving again then numbers it.
 */
export const create = async (
  input: CreateBlogCategoryInput,
  context: RequestContext,
): Promise<BlogCategorySummary> =>
  withTransaction(async (client) => {
    const existing = await categoriesRepository.count(client);
    if (existing >= LIMITS.MAX_BLOG_CATEGORIES) {
      throw new ConflictError(
        `The blog holds at most ${LIMITS.MAX_BLOG_CATEGORIES} categories. Delete or merge one first.`,
        'BLOG_CATEGORY_LIMIT_REACHED',
      );
    }

    const slug = firstFreeSlug(
      deriveBlogSlug(input.label, SLUG_MAX) || FALLBACK_SLUG,
      new Set(await categoriesRepository.findAllSlugs(client)),
      SLUG_MAX,
    );

    // Appended to the end of the row. Position is an editorial decision made
    // with the reorder arrows afterwards, not a number typed on the form.
    const displayOrder = await categoriesRepository.nextDisplayOrder(client);

    const category = await withSlugConflict(SLUG_CONFLICT, slug, () =>
      categoriesRepository.create({ ...input, slug, displayOrder }, context.adminId, client),
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_CATEGORY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: category.id,
        newValues: auditSnapshot(category),
      },
      context,
      client,
    );

    return category;
  });

export const update = async (
  id: string,
  patch: UpdateBlogCategoryInput,
  context: RequestContext,
): Promise<BlogCategorySummary> =>
  withTransaction(async (client) => {
    const existing = await categoriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Blog category');

    const saved = await categoriesRepository.update(id, patch, context.adminId, client);
    if (!saved) throw new NotFoundError('Blog category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_CATEGORY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
        newValues: auditSnapshot(saved),
      },
      context,
      client,
    );

    return saved;
  });

/**
 * Publish / unpublish - the Active/Inactive control. Separate from update()
 * because it is a different decision with a different consequence: an
 * INACTIVE category takes its chip off the page AND hides every post filed
 * under it, from the grid and from the article URLs, until it is published
 * again. The trail should say which of the two happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<BlogCategorySummary> =>
  withTransaction(async (client) => {
    const existing = await categoriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Blog category');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) {
      const current = await categoriesRepository.findById(id, client);
      if (!current) throw new NotFoundError('Blog category');
      return current;
    }

    const saved = await categoriesRepository.updateStatus(id, status, context.adminId, client);
    if (!saved) throw new NotFoundError('Blog category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_CATEGORY_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: saved.status },
      },
      context,
      client,
    );

    return saved;
  });

/**
 * Takes every category's id in its new order. Requiring the whole set is what
 * makes the result a total order: a partial list would leave the rows it did
 * not mention wherever their old numbers happen to fall among the new ones.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<BlogCategorySummary[]> =>
  withTransaction(async (client) => {
    const total = await categoriesRepository.count(client);
    const existingIds = await categoriesRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more categories do not exist', [
        {
          field: 'ids',
          message: `Unknown blog category ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_BLOG_CATEGORY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every category', [
        {
          field: 'ids',
          message: `Expected all ${total} category ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await categoriesRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_CATEGORIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Read on `client` so the list reflects the order just written.
    return categoriesRepository.findAll({}, client);
  });

/**
 * A hard delete - refused while any post, of any status, is still filed under
 * the category. Deleting a topic must never take its articles with it, and an
 * INACTIVE post is still an article somebody wrote. The way out is to move
 * those posts to another category (or delete them) first; unpublishing the
 * category is the reversible alternative that needs neither.
 */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    // The row lock is what keeps a post from being filed under this category
    // between the count and the delete - see findByIdForUpdate.
    const existing = await categoriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Blog category');

    const posts = await categoriesRepository.countPosts(id, client);
    if (posts > 0) {
      throw new ConflictError(
        `This category still has ${posts} post${posts === 1 ? '' : 's'}. Move or delete ${posts === 1 ? 'it' : 'them'} first, or unpublish the category instead.`,
        'BLOG_CATEGORY_IN_USE',
      );
    }

    await categoriesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_CATEGORY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
