// src/modules/blog/types/posts.types.ts

import { ContentStatus } from '../../../config/constants';
import { PublicBlogCategory } from './categories.types';

// ── the article body ──────────────────────────────────────────────────────

/*
 * A post's body is a list of structured blocks - exactly the four shapes
 * data/blog.js has always used - so no markdown or HTML is ever stored, and
 * the site renders each block with its own element rather than interpreting
 * markup.
 */

/** A paragraph. */
export interface BlogParagraphBlock {
  type: 'p';
  text: string;
}

/** A section heading inside the article. */
export interface BlogHeadingBlock {
  type: 'h2';
  text: string;
}

/** A bullet list, one string per bullet. */
export interface BlogListBlock {
  type: 'ul';
  items: string[];
}

/** A pull quote, with an optional attribution line. */
export interface BlogQuoteBlock {
  type: 'quote';
  text: string;
  cite: string | null;
}

export type BlogBodyBlock =
  | BlogParagraphBlock
  | BlogHeadingBlock
  | BlogListBlock
  | BlogQuoteBlock;

export type BlogBodyBlockType = BlogBodyBlock['type'];

// ── the stored post ───────────────────────────────────────────────────────

/** A post's category, as far as a post needs to name it. */
export interface BlogPostCategoryRef {
  id: string;
  slug: string;
  label: string;
}

/**
 * A post exactly as it is stored, with its category joined in. Internal: the
 * admin API answers with ResolvedBlogPost, which leaves legacyImageUrl out.
 */
export interface BlogPost {
  id: string;
  /**
   * The URL segment: /blog/<slug>. Unique across the blog. Derived from the
   * title when the post is created and never changed afterwards, so a post's
   * address outlives edits to its title.
   */
  slug: string;
  categoryId: string;
  category: BlogPostCategoryRef;
  title: string;
  excerpt: string;
  /**
   * The image_url column: legacy / seed-only. It holds a seeded post's
   * original picture (an Unsplash URL from data/blog.js, for which no upload
   * exists), is never written or exposed by the admin API, and is cleared by
   * the first upload for the post or by removing its picture. Only ever read
   * to resolve the picture. Mutually exclusive with imageFileId.
   */
  legacyImageUrl: string | null;
  /** The post's picture: an asset uploaded through the files module. */
  imageFileId: string | null;
  /**
   * The optional phone crop of the picture - an upload only, never a URL.
   * Null means the desktop picture serves every width.
   */
  mobileImageFileId: string | null;
  /** Copy, not a number: '6 min read'. */
  readTime: string | null;
  /** 'YYYY-MM-DD' - the date on the card, and the page's only ordering. */
  publishedOn: string;
  author: string;
  lead: string;
  body: BlogBodyBlock[];
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A published post as far as a card needs it - no lead or body, so the index
 * read never loads every article to draw a grid.
 */
export interface BlogPostCard {
  slug: string;
  categorySlug: string;
  title: string;
  excerpt: string;
  legacyImageUrl: string | null;
  imageFileId: string | null;
  mobileImageFileId: string | null;
  readTime: string | null;
  publishedOn: string;
  author: string;
}

/**
 * The admin shape: the stored post without its legacy image URL, plus each
 * crop as one renderable URL - which is all the editor shows.
 */
export interface ResolvedBlogPost extends Omit<BlogPost, 'legacyImageUrl'> {
  /** The public file route for an upload, a seeded post's picture, or null. */
  resolvedImageUrl: string | null;
  /** The public file route for the phone crop, or null. */
  resolvedMobileImageUrl: string | null;
}

/**
 * POST body. No slug: the service derives it from the title. Both crops are
 * uploads only - imageFileId and mobileImageFileId, never a URL. A slug,
 * imageUrl or mobileImageUrl a client still sends is not a field of this API
 * and is ignored, like any other unknown key.
 */
export interface CreateBlogPostInput {
  categoryId: string;
  title: string;
  excerpt: string;
  imageFileId: string | null;
  mobileImageFileId: string | null;
  readTime: string | null;
  publishedOn: string;
  author: string;
  lead: string;
  body: BlogBodyBlock[];
  status: ContentStatus;
}

/**
 * Absent leaves a field untouched; `null` clears the nullable ones. Setting
 * imageFileId - to an upload or to null - also clears a seeded post's legacy
 * image URL (see BlogPost.legacyImageUrl). No slug: it is fixed when the post
 * is created.
 */
export interface UpdateBlogPostInput {
  categoryId?: string;
  title?: string;
  excerpt?: string;
  imageFileId?: string | null;
  mobileImageFileId?: string | null;
  readTime?: string | null;
  publishedOn?: string;
  author?: string;
  lead?: string;
  body?: BlogBodyBlock[];
  status?: ContentStatus;
}

/**
 * The admin list's filters. Unpaged, like every CMS list in this API - the
 * set is bounded by LIMITS.MAX_BLOG_POSTS; see the note there.
 */
export interface BlogPostFilters {
  status?: ContentStatus;
  categoryId?: string;
  search?: string;
}

// ── public shapes ─────────────────────────────────────────────────────────

/*
 * The website-facing shapes. No ids, timestamps, authorship or status, and
 * the field names are the ones data/blog.js's own post objects use
 * (`category` as the category's slug, `image`, `date`), so a fetched post and
 * a built-in one are interchangeable at the render site.
 */

/** A post as a card in the grid, the featured card, or a related-post card. */
export interface PublicBlogPostSummary {
  slug: string;
  /** The category's slug ('food-mfg'). */
  category: string;
  title: string;
  excerpt: string;
  /** Resolved to a URL a browser can load, or null for no picture. */
  image: string | null;
  /**
   * The phone crop, resolved the same way - the site's <picture> source at
   * (max-width: 767px). Null when there is none, and then `image` serves
   * every width; always null when `image` is.
   */
  mobileImage: string | null;
  readTime: string | null;
  /** 'YYYY-MM-DD'. */
  date: string;
  author: string;
}

/**
 * The /blog page's data in one read: the chips and the posts. Two answers the
 * site has to be able to tell apart, exactly as on the About page's people
 * grid - see blogPostsService.getPublishedIndex:
 *
 *   hasCategories / hasPosts false   nothing is authored here at all; keep the
 *                                    site's built-in list.
 *   true with an empty array         rows exist but none is published; render
 *                                    the empty state, because that is what
 *                                    somebody chose.
 */
export interface PublicBlogIndex {
  categories: PublicBlogCategory[];
  hasCategories: boolean;
  posts: PublicBlogPostSummary[];
  hasPosts: boolean;
}

/** A post as its own article page, with up to three related cards. */
export interface PublicBlogPost extends PublicBlogPostSummary {
  lead: string;
  body: BlogBodyBlock[];
  related: PublicBlogPostSummary[];
}
