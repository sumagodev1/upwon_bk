// src/modules/knowledgebase/services/categories.service.ts

import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { SlugConflictSpec, withSlugConflict } from '../../blog/utils/slug-conflict';
import { deriveBlogSlug, firstFreeSlug } from '../../blog/utils/slug';
import * as categoriesRepository from '../repositories/categories.repository';
import {
  CreateKbCategoryInput,
  KbCategory,
  KbCategoryFilters,
  KbCategorySummary,
  PublicKbCategoryIndex,
  UpdateKbCategoryInput,
} from '../types/categories.types';
import { KB_CATEGORY_SLUG_MAX } from '../utils/slug-limits';

const MODULE = 'knowledgebase';
const ENTITY = 'kb_category';

const SLUG_CONFLICT: SlugConflictSpec = {
  constraint: 'kb_categories_slug_key',
  code: 'KB_CATEGORY_SLUG_TAKEN',
  noun: 'A knowledgebase category',
};

/** The slug of a category whose name holds no letter or digit ('&&'). */
const FALLBACK_SLUG = 'category';

/** The whole row, so a deleted category is recoverable from the trail. */
const auditSnapshot = (category: KbCategory): Record<string, unknown> => ({
  slug: category.slug,
  name: category.name,
  description: category.description,
  icon: category.icon,
  status: category.status,
  displayOrder: category.displayOrder,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (filters: KbCategoryFilters): Promise<KbCategorySummary[]> =>
  categoriesRepository.findAll(filters);

export const getById = async (id: string): Promise<KbCategorySummary> => {
  const category = await categoriesRepository.findById(id);
  if (!category) throw new NotFoundError('Knowledgebase category');
  return category;
};

// ── public reads ──────────────────────────────────────────────────────────

/**
 * The /knowledgebase hub's cards: ACTIVE categories in display order, each
 * counting its ACTIVE articles. Always a 200: "nothing authored" is carried by
 * hasCategories, which counts rows regardless of status, so the site can tell
 * "nothing here at all" (keep the built-in cards) from "everything is
 * unpublished" (render the empty state somebody chose) - the blog index's
 * rule.
 */
export const getPublishedIndex = async (): Promise<PublicKbCategoryIndex> => {
  const [categories, total] = await Promise.all([
    categoriesRepository.findPublishedWithCounts(),
    categoriesRepository.count(),
  ]);
  return { categories, hasCategories: total > 0 };
};

// ── writes ────────────────────────────────────────────────────────────────

/**
 * A new category's slug - its /knowledgebase/<slug> address - is not an
 * input: it is derived from the name - 'Compliance & Food Safety' ->
 * 'compliance-food-safety' - and, since the author cannot choose another, a
 * name whose slug is already held is numbered ('-2', '-3'...) rather than
 * refused. It never changes afterwards; update() has no slug to write, so a
 * link to the category, or to any article in it, survives a rename. Only a
 * race between two creates of the same name can still meet the unique
 * constraint, which withSlugConflict answers with the usual 409 - saving again
 * then numbers it.
 */
export const create = async (
  input: CreateKbCategoryInput,
  context: RequestContext,
): Promise<KbCategorySummary> =>
  withTransaction(async (client) => {
    const existing = await categoriesRepository.count(client);
    if (existing >= LIMITS.MAX_KB_CATEGORIES) {
      throw new ConflictError(
        `The knowledgebase holds at most ${LIMITS.MAX_KB_CATEGORIES} categories. Delete or merge one first.`,
        'KB_CATEGORY_LIMIT_REACHED',
      );
    }

    const slug = firstFreeSlug(
      deriveBlogSlug(input.name, KB_CATEGORY_SLUG_MAX) || FALLBACK_SLUG,
      new Set(await categoriesRepository.findAllSlugs(client)),
      KB_CATEGORY_SLUG_MAX,
    );

    // Appended to the end of the grid. Position is an editorial decision made
    // with the reorder arrows afterwards, not a number typed on the form.
    const displayOrder = await categoriesRepository.nextDisplayOrder(client);

    const category = await withSlugConflict(SLUG_CONFLICT, slug, () =>
      categoriesRepository.create({ ...input, slug, displayOrder }, context.adminId, client),
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_CATEGORY_CREATED,
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
  patch: UpdateKbCategoryInput,
  context: RequestContext,
): Promise<KbCategorySummary> =>
  withTransaction(async (client) => {
    const existing = await categoriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Knowledgebase category');

    const saved = await categoriesRepository.update(id, patch, context.adminId, client);
    if (!saved) throw new NotFoundError('Knowledgebase category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_CATEGORY_UPDATED,
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
 * INACTIVE category takes its card off the hub, its page off the site AND
 * every article filed under it, from its related lists and from the article
 * URLs, until it is published again. The trail should say which of the two
 * happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<KbCategorySummary> =>
  withTransaction(async (client) => {
    const existing = await categoriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Knowledgebase category');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) {
      const current = await categoriesRepository.findById(id, client);
      if (!current) throw new NotFoundError('Knowledgebase category');
      return current;
    }

    const saved = await categoriesRepository.updateStatus(id, status, context.adminId, client);
    if (!saved) throw new NotFoundError('Knowledgebase category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_CATEGORY_STATUS_CHANGED,
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
): Promise<KbCategorySummary[]> =>
  withTransaction(async (client) => {
    const total = await categoriesRepository.count(client);
    const existingIds = await categoriesRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more categories do not exist', [
        {
          field: 'ids',
          message: `Unknown knowledgebase category ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_KB_CATEGORY',
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
        action: AUDIT_ACTIONS.KB_CATEGORIES_REORDERED,
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
 * A hard delete - refused while any article, of any status, is still filed
 * under the category. Deleting a category must never take its guides with it,
 * and an INACTIVE article is still a guide somebody wrote. The way out is to
 * move those articles to another category (or delete them) first;
 * unpublishing the category is the reversible alternative that needs neither.
 */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    // The row lock is what keeps an article from being filed under this
    // category between the count and the delete - see findByIdForUpdate.
    const existing = await categoriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Knowledgebase category');

    const articles = await categoriesRepository.countArticles(id, client);
    if (articles > 0) {
      throw new ConflictError(
        `This category still has ${articles} article${articles === 1 ? '' : 's'}. Move or delete ${articles === 1 ? 'it' : 'them'} first, or unpublish the category instead.`,
        'KB_CATEGORY_IN_USE',
      );
    }

    await categoriesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_CATEGORY_DELETED,
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
