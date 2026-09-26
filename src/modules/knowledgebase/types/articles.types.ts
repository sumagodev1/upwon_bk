// src/modules/knowledgebase/types/articles.types.ts

import { ContentStatus } from '../../../config/constants';
import { BlogBodyBlock } from '../../blog/types/posts.types';
import { PublicKbCategory } from './categories.types';

// ── the article body ──────────────────────────────────────────────────────

/*
 * An article's body is the blog post's body, block for block - the same four
 * shapes (p, h2, ul, quote) data/knowledgebase.js has always written, which
 * the site already renders with the blog's code. Aliased rather than
 * redeclared so the two can never drift: the admin panel edits both with the
 * one block editor, and the validator reads both with the one reader.
 */
export type KbBodyBlock = BlogBodyBlock;

/**
 * One "Frequently asked" entry under the article. data/knowledgebase.js wrote
 * these as { q, a }; the API spells the keys out.
 */
export interface KbFaq {
  question: string;
  answer: string;
}

// ── the stored article ────────────────────────────────────────────────────

/** An article's category, as far as an article needs to name it. */
export interface KbArticleCategoryRef {
  id: string;
  slug: string;
  name: string;
}

/**
 * An article exactly as it is stored, with its category joined in.
 *
 * No description, keywords, picture or publish date: the site renders none of
 * them for an article it fetched. Its search description is the excerpt, and
 * its only date is updatedOn.
 */
export interface KbArticle {
  id: string;
  /**
   * The last URL segment: /knowledgebase/<category>/<slug>. Unique across the
   * whole knowledgebase, not per category, so moving an article to another
   * category can never collide. Derived from the title when the article is
   * created and never changed afterwards.
   */
  slug: string;
  categoryId: string;
  category: KbArticleCategoryRef;
  title: string;
  /** The card's two lines, and the article's opening (lead) paragraph. */
  excerpt: string;
  /** Copy, not a number: '6 min read'. */
  readTime: string;
  /**
   * 'YYYY-MM-DD' - the "Updated" date on the card and the article, and the
   * category page's only ordering. Authored, not the row's updated_at: fixing
   * a typo is not a new revision of the guide.
   */
  updatedOn: string;
  body: KbBodyBlock[];
  faqs: KbFaq[];
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A published article as far as a card needs it - no body or FAQs, so the
 * category page and the related list never load every article to draw a grid.
 */
export interface KbArticleCard {
  slug: string;
  categorySlug: string;
  title: string;
  excerpt: string;
  readTime: string;
  updatedOn: string;
}

/**
 * POST body. No slug: the service derives it from the title. A slug a client
 * still sends is not a field of this API and is ignored, like any other
 * unknown key.
 */
export interface CreateKbArticleInput {
  categoryId: string;
  title: string;
  excerpt: string;
  readTime: string;
  updatedOn: string;
  body: KbBodyBlock[];
  faqs: KbFaq[];
  status: ContentStatus;
}

/**
 * Absent leaves a field untouched. No column here is nullable; an article
 * with no FAQs is an empty list, not null. No slug: it is fixed when the
 * article is created.
 */
export interface UpdateKbArticleInput {
  categoryId?: string;
  title?: string;
  excerpt?: string;
  readTime?: string;
  updatedOn?: string;
  body?: KbBodyBlock[];
  faqs?: KbFaq[];
  status?: ContentStatus;
}

/**
 * The admin list's filters. Unpaged, like every CMS list in this API - the
 * set is bounded by LIMITS.MAX_KB_ARTICLES.
 */
export interface KbArticleFilters {
  status?: ContentStatus;
  categoryId?: string;
  search?: string;
}

// ── public shapes ─────────────────────────────────────────────────────────

/*
 * The website-facing shapes. No ids, timestamps, authorship or status, and
 * `category` is the category's slug, as in data/knowledgebase.js - so a
 * fetched article and a built-in one are interchangeable at the render site.
 */

/** An article as a card on its category page, or as a related guide. */
export interface PublicKbArticleSummary {
  slug: string;
  /** The category's slug ('inventory-management'). */
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  /** 'YYYY-MM-DD'. */
  updatedOn: string;
}

/** One category's page: its header and its published articles, newest first. */
export interface PublicKbCategoryPage {
  category: PublicKbCategory;
  articles: PublicKbArticleSummary[];
}

/** An article as its own page, with up to three related guides. */
export interface PublicKbArticle extends PublicKbArticleSummary {
  /** The category's name, for the eyebrow above the title. */
  categoryName: string;
  body: KbBodyBlock[];
  faqs: KbFaq[];
  related: PublicKbArticleSummary[];
}
