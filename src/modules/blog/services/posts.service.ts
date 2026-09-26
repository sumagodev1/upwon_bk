// src/modules/blog/services/posts.service.ts

import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { withTransaction, Executor } from '../../../config/database';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as categoriesRepository from '../repositories/categories.repository';
import * as postsRepository from '../repositories/posts.repository';
import {
  BlogPost,
  BlogPostCard,
  BlogPostFilters,
  CreateBlogPostInput,
  PublicBlogIndex,
  PublicBlogPost,
  PublicBlogPostSummary,
  ResolvedBlogPost,
  UpdateBlogPostInput,
} from '../types/posts.types';
import { BLOG_IMAGE_SPECS } from '../utils/blog-image-spec';
import { assertSlugAvailable, SlugConflictSpec, withSlugConflict } from '../utils/slug-conflict';
import { isPlausibleSlug } from '../utils/slug';

const MODULE = 'blog';
const ENTITY = 'blog_post';

const SLUG_CONFLICT: SlugConflictSpec = {
  constraint: 'blog_posts_slug_key',
  code: 'BLOG_POST_SLUG_TAKEN',
  noun: 'A blog post',
};

/** The posts.validator cap, so a public :slug longer than any real one 404s unread. */
const SLUG_MAX = 120;

/** "Keep reading" cards under an article - what getRelatedPosts has always shown. */
const RELATED_LIMIT = 3;

// ── mapping ───────────────────────────────────────────────────────────────

/**
 * The admin shape. The legacy image URL is read only to resolve the picture
 * and never leaves the API: the editor works with the uploads (imageFileId,
 * mobileImageFileId) and shows whatever the two resolved URLs render.
 */
const toResolvedPost = async ({
  legacyImageUrl,
  ...post
}: BlogPost): Promise<ResolvedBlogPost> => {
  const [resolvedImageUrl, resolvedMobileImageUrl] = await Promise.all([
    resolveImageSource(legacyImageUrl, post.imageFileId),
    resolveImageSource(null, post.mobileImageFileId),
  ]);
  return { ...post, resolvedImageUrl, resolvedMobileImageUrl };
};

const toResolvedPosts = (posts: BlogPost[]): Promise<ResolvedBlogPost[]> =>
  Promise.all(posts.map(toResolvedPost));

/** A full post narrowed to what a card needs. */
const cardOf = (post: BlogPost): BlogPostCard => ({
  slug: post.slug,
  categorySlug: post.category.slug,
  title: post.title,
  excerpt: post.excerpt,
  legacyImageUrl: post.legacyImageUrl,
  imageFileId: post.imageFileId,
  mobileImageFileId: post.mobileImageFileId,
  readTime: post.readTime,
  publishedOn: post.publishedOn,
  author: post.author,
});

/**
 * A card in data/blog.js's own keys: `category` is the category's slug,
 * `image` the one URL to render and `date` the YYYY-MM-DD the site's
 * formatPostDate already reads - so a fetched card and a built-in one render
 * through the same code. `mobileImage` is the one addition: the phone crop's
 * URL, which the site swaps in under `image` below 768px. No alt text: the
 * site labels a post's picture with its title, as it always has.
 */
const toPublicSummary = async (card: BlogPostCard): Promise<PublicBlogPostSummary> => {
  const [image, mobileImage] = await Promise.all([
    resolveImageSource(card.legacyImageUrl, card.imageFileId),
    resolveImageSource(null, card.mobileImageFileId),
  ]);
  return {
    slug: card.slug,
    category: card.categorySlug,
    title: card.title,
    excerpt: card.excerpt,
    image,
    // Only ever a second source under a desktop picture. The writes refuse a
    // phone crop on its own; this covers a desktop upload purged since.
    mobileImage: image ? mobileImage : null,
    readTime: card.readTime,
    date: card.publishedOn,
    author: card.author,
  };
};

/**
 * Every authored field, so a deleted article is recoverable from the trail.
 * The legacy image URL is not one - nothing authors it; a seeded picture is
 * recoverable from the seed data.
 */
const auditSnapshot = (post: BlogPost): Record<string, unknown> => ({
  slug: post.slug,
  categoryId: post.categoryId,
  title: post.title,
  excerpt: post.excerpt,
  imageFileId: post.imageFileId,
  mobileImageFileId: post.mobileImageFileId,
  readTime: post.readTime,
  publishedOn: post.publishedOn,
  author: post.author,
  lead: post.lead,
  body: post.body,
  status: post.status,
});

const assertUsablePostImage = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, BLOG_IMAGE_SPECS.post, 'imageFileId');

const assertUsablePostMobileImage = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, BLOG_IMAGE_SPECS.postMobile, 'mobileImageFileId');

/**
 * A phone crop is only ever a second source under a desktop picture: the
 * public read drops it when there is no `image`, so a post whose only picture
 * is the phone crop would show none at all and the upload would be thrown away
 * without a word. Refused instead, as the About hero refuses a backdrop with
 * only a mobile crop (about-page/validators/hero-section.validator.ts), and
 * reported against the desktop slot, which is the one that is missing.
 *
 * `image` is whatever serves the desktop once the write lands - an upload, or
 * a seeded post's legacy URL that the write leaves in place.
 */
const assertMobileImageHasImage = (
  image: string | null,
  mobileImageFileId: string | null,
): void => {
  if (!mobileImageFileId || image) return;
  throw new ValidationError('A mobile image needs a desktop image', [
    {
      field: 'imageFileId',
      message:
        'This post has a mobile image but no desktop image. Upload the desktop image, or remove the mobile one - the mobile crop is only used in place of it on narrow screens.',
      code: 'MOBILE_IMAGE_WITHOUT_IMAGE',
    },
  ]);
};

/**
 * A post must be filed under a category that exists. Checked here rather than
 * left to the foreign key so the error names the field; an INACTIVE category
 * is accepted - an editor may well prepare a topic's first posts before the
 * chip goes live.
 */
const assertCategoryExists = async (categoryId: string, executor: Executor): Promise<void> => {
  const category = await categoriesRepository.findById(categoryId, executor);
  if (!category) {
    throw new ValidationError('Blog category not found', [
      {
        field: 'categoryId',
        message: 'No such blog category, or it has been deleted',
        code: 'UNKNOWN_CATEGORY',
      },
    ]);
  }
};

// ── admin reads ───────────────────────────────────────────────────────────

export const list = async (filters: BlogPostFilters): Promise<ResolvedBlogPost[]> =>
  toResolvedPosts(await postsRepository.findAll(filters));

export const getById = async (id: string): Promise<ResolvedBlogPost> => {
  const post = await postsRepository.findById(id);
  if (!post) throw new NotFoundError('Blog post');
  return toResolvedPost(post);
};

// ── public reads ──────────────────────────────────────────────────────────

/**
 * The /blog page's chips and grid in one read.
 *
 * Categories: ACTIVE ones in display order, each counting its ACTIVE posts.
 * Posts: ACTIVE ones under an ACTIVE category, newest first - the first is the
 * featured card. Always a 200: unlike the two copy blocks there is no single
 * row whose absence means "never authored", so that answer is carried by the
 * two has* flags instead. They count rows regardless of status, so the site
 * can tell "nothing here at all" (keep the built-in list) from "everything is
 * unpublished" (render the empty state somebody chose) - the About page's
 * hasMembers rule.
 */
export const getPublishedIndex = async (): Promise<PublicBlogIndex> => {
  const [categories, cards, categoryTotal, postTotal] = await Promise.all([
    categoriesRepository.findPublishedWithCounts(),
    postsRepository.findPublishedCards(),
    categoriesRepository.count(),
    postsRepository.count(),
  ]);

  return {
    categories,
    hasCategories: categoryTotal > 0,
    posts: await Promise.all(cards.map(toPublicSummary)),
    hasPosts: postTotal > 0,
  };
};

/**
 * One article with its related cards. 404 for an unknown slug, an unpublished
 * post, or a post under an unpublished category - one answer for all three,
 * so the route says nothing about which drafts exist.
 */
export const getPublishedPost = async (slug: string): Promise<PublicBlogPost> => {
  // A malformed slug cannot name a row; answer it without a query.
  if (!isPlausibleSlug(slug, SLUG_MAX)) throw new NotFoundError('Blog post');

  const post = await postsRepository.findPublishedBySlug(slug);
  if (!post) throw new NotFoundError('Blog post');

  const related = await postsRepository.findPublishedRelatedCards(
    post.id,
    post.categoryId,
    RELATED_LIMIT,
  );

  return {
    ...(await toPublicSummary(cardOf(post))),
    lead: post.lead,
    body: post.body,
    related: await Promise.all(related.map(toPublicSummary)),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateBlogPostInput,
  context: RequestContext,
): Promise<ResolvedBlogPost> => {
  assertMobileImageHasImage(input.imageFileId, input.mobileImageFileId);

  // Outside the transaction: they read the uploaded bytes back from storage,
  // and a row lock should not be held across that.
  if (input.imageFileId) await assertUsablePostImage(input.imageFileId);
  if (input.mobileImageFileId) await assertUsablePostMobileImage(input.mobileImageFileId);

  const post = await withTransaction(async (client) => {
    const total = await postsRepository.count(client);
    if (total >= LIMITS.MAX_BLOG_POSTS) {
      throw new ConflictError(
        `The blog holds at most ${LIMITS.MAX_BLOG_POSTS} posts. Delete an old one first.`,
        'BLOG_POST_LIMIT_REACHED',
      );
    }

    await assertCategoryExists(input.categoryId, client);
    await assertSlugAvailable(SLUG_CONFLICT, input.slug, null, postsRepository.findIdBySlug, client);

    const created = await withSlugConflict(SLUG_CONFLICT, input.slug, () =>
      postsRepository.create(input, context.adminId, client),
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_POST_CREATED,
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

  return toResolvedPost(post);
};

export const update = async (
  id: string,
  patch: UpdateBlogPostInput,
  context: RequestContext,
): Promise<ResolvedBlogPost> => {
  if (patch.imageFileId) await assertUsablePostImage(patch.imageFileId);
  if (patch.mobileImageFileId) await assertUsablePostMobileImage(patch.mobileImageFileId);

  const post = await withTransaction(async (client) => {
    const existing = await postsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Blog post');

    // Only when the patch touches a picture, so an edit to the copy is never
    // refused over a desktop upload that was purged from under the post.
    if (patch.imageFileId !== undefined || patch.mobileImageFileId !== undefined) {
      assertMobileImageHasImage(
        // Setting imageFileId, even to null, also clears the legacy URL.
        patch.imageFileId !== undefined
          ? patch.imageFileId
          : (existing.imageFileId ?? existing.legacyImageUrl),
        patch.mobileImageFileId !== undefined
          ? patch.mobileImageFileId
          : existing.mobileImageFileId,
      );
    }

    if (patch.categoryId !== undefined && patch.categoryId !== existing.categoryId) {
      await assertCategoryExists(patch.categoryId, client);
    }
    if (patch.slug !== undefined && patch.slug !== existing.slug) {
      await assertSlugAvailable(SLUG_CONFLICT, patch.slug, id, postsRepository.findIdBySlug, client);
    }

    const saved = await withSlugConflict(SLUG_CONFLICT, patch.slug, () =>
      postsRepository.update(id, patch, context.adminId, client),
    );
    if (!saved) throw new NotFoundError('Blog post');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_POST_UPDATED,
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

  return toResolvedPost(post);
};

/**
 * Publish / unpublish, separate from update() for the same reason as the
 * category's: a different decision, and the trail should say which one
 * happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedBlogPost> => {
  const post = await withTransaction(async (client) => {
    const existing = await postsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Blog post');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) return existing;

    const saved = await postsRepository.updateStatus(id, status, context.adminId, client);
    if (!saved) throw new NotFoundError('Blog post');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_POST_STATUS_CHANGED,
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

  return toResolvedPost(post);
};

/** A hard delete; INACTIVE covers "take it down for now". */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await postsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Blog post');

    await postsRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_POST_DELETED,
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
