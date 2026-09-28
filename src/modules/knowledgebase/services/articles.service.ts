// src/modules/knowledgebase/services/articles.service.ts

import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { Executor, withTransaction } from '../../../config/database';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { SlugConflictSpec, withSlugConflict } from '../../blog/utils/slug-conflict';
import { deriveBlogSlug, firstFreeSlug, isPlausibleSlug } from '../../blog/utils/slug';
import * as articlesRepository from '../repositories/articles.repository';
import * as categoriesRepository from '../repositories/categories.repository';
import {
  CreateKbArticleInput,
  KbArticle,
  KbArticleCard,
  KbArticleFilters,
  PublicKbArticle,
  PublicKbArticleSummary,
  PublicKbCategoryPage,
  UpdateKbArticleInput,
} from '../types/articles.types';
import { KB_ARTICLE_SLUG_MAX, KB_CATEGORY_SLUG_MAX } from '../utils/slug-limits';

const MODULE = 'knowledgebase';
const ENTITY = 'kb_article';

const SLUG_CONFLICT: SlugConflictSpec = {
  constraint: 'kb_articles_slug_key',
  code: 'KB_ARTICLE_SLUG_TAKEN',
  noun: 'A knowledgebase article',
};

/** The slug of an article whose title holds no letter or digit ('???'). */
const FALLBACK_SLUG = 'article';

/** "Related guides" beside an article - what getRelatedArticles has always capped at. */
const RELATED_LIMIT = 3;

// ── mapping ───────────────────────────────────────────────────────────────

/**
 * A card in data/knowledgebase.js's own keys: `category` is the category's
 * slug, and updatedOn is the YYYY-MM-DD the site's formatKbDate already reads
 * - so a fetched card and a built-in one render through the same code.
 */
const toPublicSummary = (card: KbArticleCard): PublicKbArticleSummary => ({
  slug: card.slug,
  category: card.categorySlug,
  title: card.title,
  excerpt: card.excerpt,
  readTime: card.readTime,
  updatedOn: card.updatedOn,
});

/** A full article narrowed to what a card needs. */
const cardOf = (article: KbArticle): KbArticleCard => ({
  slug: article.slug,
  categorySlug: article.category.slug,
  title: article.title,
  excerpt: article.excerpt,
  readTime: article.readTime,
  updatedOn: article.updatedOn,
});

/** Every authored field, so a deleted article is recoverable from the trail. */
const auditSnapshot = (article: KbArticle): Record<string, unknown> => ({
  slug: article.slug,
  categoryId: article.categoryId,
  title: article.title,
  excerpt: article.excerpt,
  readTime: article.readTime,
  updatedOn: article.updatedOn,
  body: article.body,
  faqs: article.faqs,
  status: article.status,
});

/**
 * An article must be filed under a category that exists. Checked here rather
 * than left to the foreign key so the error names the field; an INACTIVE
 * category is accepted - an editor may well prepare a category's first guides
 * before its card goes live.
 */
const assertCategoryExists = async (categoryId: string, executor: Executor): Promise<void> => {
  const category = await categoriesRepository.findById(categoryId, executor);
  if (!category) {
    throw new ValidationError('Knowledgebase category not found', [
      {
        field: 'categoryId',
        message: 'No such knowledgebase category, or it has been deleted',
        code: 'UNKNOWN_CATEGORY',
      },
    ]);
  }
};

// ── admin reads ───────────────────────────────────────────────────────────

export const list = async (filters: KbArticleFilters): Promise<KbArticle[]> =>
  articlesRepository.findAll(filters);

export const getById = async (id: string): Promise<KbArticle> => {
  const article = await articlesRepository.findById(id);
  if (!article) throw new NotFoundError('Knowledgebase article');
  return article;
};

// ── public reads ──────────────────────────────────────────────────────────

/**
 * One category's page: its header and its ACTIVE articles, newest first. 404
 * for an unknown slug and for an INACTIVE category - one answer for both, so
 * the route says nothing about which drafts exist. An ACTIVE category with no
 * ACTIVE articles is a 200 with an empty list: the page exists, it is simply
 * empty.
 */
export const getPublishedCategoryPage = async (slug: string): Promise<PublicKbCategoryPage> => {
  // A malformed slug cannot name a row; answer it without a query.
  if (!isPlausibleSlug(slug, KB_CATEGORY_SLUG_MAX)) {
    throw new NotFoundError('Knowledgebase category');
  }

  const category = await categoriesRepository.findPublishedBySlug(slug);
  if (!category) throw new NotFoundError('Knowledgebase category');

  const cards = await articlesRepository.findPublishedCardsByCategory(category.id);

  return {
    category: {
      slug: category.slug,
      name: category.name,
      description: category.description,
      icon: category.icon,
    },
    articles: cards.map(toPublicSummary),
  };
};

/**
 * One article with its related guides. 404 for an unknown slug, an unpublished
 * article, an article under an unpublished category, and an article that is
 * not filed under the category the URL names - one answer for all four.
 */
export const getPublishedArticle = async (
  categorySlug: string,
  articleSlug: string,
): Promise<PublicKbArticle> => {
  if (
    !isPlausibleSlug(categorySlug, KB_CATEGORY_SLUG_MAX) ||
    !isPlausibleSlug(articleSlug, KB_ARTICLE_SLUG_MAX)
  ) {
    throw new NotFoundError('Knowledgebase article');
  }

  const article = await articlesRepository.findPublishedBySlugs(categorySlug, articleSlug);
  if (!article) throw new NotFoundError('Knowledgebase article');

  const related = await articlesRepository.findPublishedRelatedCards(
    article.id,
    article.categoryId,
    RELATED_LIMIT,
  );

  return {
    ...toPublicSummary(cardOf(article)),
    categoryName: article.category.name,
    body: article.body,
    faqs: article.faqs,
    related: related.map(toPublicSummary),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

/**
 * A new article's slug - the last segment of its
 * /knowledgebase/<category>/<slug> address - is not an input: it is derived
 * from the title - 'What Is FEFO and Why It Matters' ->
 * 'what-is-fefo-and-why-it-matters' - and a title whose slug is already held
 * anywhere in the knowledgebase is numbered ('-2', '-3'...) rather than
 * refused. It never changes afterwards; update() has no slug to write, so a
 * link to the article survives edits to its title. Only a race between two
 * creates of the same title can still meet the unique constraint, which
 * withSlugConflict answers with the usual 409 - saving again then numbers it.
 */
export const create = async (
  input: CreateKbArticleInput,
  context: RequestContext,
): Promise<KbArticle> =>
  withTransaction(async (client) => {
    const total = await articlesRepository.count(client);
    if (total >= LIMITS.MAX_KB_ARTICLES) {
      throw new ConflictError(
        `The knowledgebase holds at most ${LIMITS.MAX_KB_ARTICLES} articles. Delete an old one first.`,
        'KB_ARTICLE_LIMIT_REACHED',
      );
    }

    await assertCategoryExists(input.categoryId, client);

    const slug = firstFreeSlug(
      deriveBlogSlug(input.title, KB_ARTICLE_SLUG_MAX) || FALLBACK_SLUG,
      new Set(await articlesRepository.findAllSlugs(client)),
      KB_ARTICLE_SLUG_MAX,
    );

    const created = await withSlugConflict(SLUG_CONFLICT, slug, () =>
      articlesRepository.create({ ...input, slug }, context.adminId, client),
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_ARTICLE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: auditSnapshot(created),
      },
      context,
      client,
    );

    return created;
  });

/**
 * A partial edit. Moving an article to another category moves its public
 * address with it - /knowledgebase/<new category>/<slug> - since the category
 * is part of the URL; the slug itself stays.
 */
export const update = async (
  id: string,
  patch: UpdateKbArticleInput,
  context: RequestContext,
): Promise<KbArticle> =>
  withTransaction(async (client) => {
    const existing = await articlesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Knowledgebase article');

    if (patch.categoryId !== undefined && patch.categoryId !== existing.categoryId) {
      await assertCategoryExists(patch.categoryId, client);
    }

    const saved = await articlesRepository.update(id, patch, context.adminId, client);
    if (!saved) throw new NotFoundError('Knowledgebase article');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_ARTICLE_UPDATED,
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
 * Publish / unpublish, separate from update() for the same reason as the
 * category's: a different decision, and the trail should say which one
 * happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<KbArticle> =>
  withTransaction(async (client) => {
    const existing = await articlesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Knowledgebase article');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) return existing;

    const saved = await articlesRepository.updateStatus(id, status, context.adminId, client);
    if (!saved) throw new NotFoundError('Knowledgebase article');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_ARTICLE_STATUS_CHANGED,
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

/** A hard delete; INACTIVE covers "take it down for now". */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await articlesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Knowledgebase article');

    await articlesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.KB_ARTICLE_DELETED,
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
