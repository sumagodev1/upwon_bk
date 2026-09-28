// src/modules/knowledgebase/types/categories.types.ts

import { ContentStatus } from '../../../config/constants';

/**
 * One category card on /knowledgebase ('Inventory Management'), exactly as
 * stored - and, through its slug, the /knowledgebase/<slug> page it opens.
 *
 * Articles are filed under exactly one category each, by id; the public side
 * names an article's category by its slug instead, the way data/knowledgebase.js
 * always has ('inventory-management'), so a built-in article and a fetched one
 * are interchangeable at the render site.
 */
export interface KbCategory {
  id: string;
  /**
   * The URL segment: /knowledgebase/<slug>. Unique. Never an input: derived
   * from the name when the category is created, and never changed by an edit -
   * renaming a category does not move its page or break a link to one of its
   * articles.
   */
  slug: string;
  /** The card's title and the category page's headline. */
  name: string;
  /** The card's paragraph and the category page's standfirst. */
  description: string;
  /** A name from KB_CATEGORY_ICON_NAMES. */
  icon: string;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The admin row: a category plus how many articles are filed under it, of any
 * status. The count is what tells an administrator, before they try, that a
 * delete will be refused (KB_CATEGORY_IN_USE).
 */
export interface KbCategorySummary extends KbCategory {
  articleCount: number;
}

/** POST body. No slug: the service derives it from the name. */
export interface CreateKbCategoryInput {
  name: string;
  description: string;
  icon: string;
  status: ContentStatus;
}

/**
 * Absent leaves a field untouched. No column here is nullable. No slug: it is
 * fixed when the category is created.
 */
export interface UpdateKbCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  status?: ContentStatus;
}

/** Every category id, in the order they should end up in. */
export interface ReorderKbCategoriesInput {
  ids: string[];
}

export interface KbCategoryFilters {
  status?: ContentStatus;
  search?: string;
}

// ── public shapes ─────────────────────────────────────────────────────────

/*
 * The website-facing shapes. No id, status or order: an INACTIVE category is
 * simply absent, and an array's order is the display order. The keys are
 * data/knowledgebase.js's own (slug, name, description, icon - the icon as its
 * name rather than a component), so a fetched category and a built-in one
 * render through the same code.
 */

/** A category as its own page's header. */
export interface PublicKbCategory {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

/**
 * A category as a card on the hub, with the "N guides" it prints - ACTIVE
 * articles only, because that is how many a reader finds when they open it.
 */
export interface PublicKbCategoryCard extends PublicKbCategory {
  count: number;
}

/**
 * The hub's cards in one read. Two answers the site has to be able to tell
 * apart, exactly as on the blog's index:
 *
 *   hasCategories false          nothing is authored here at all; keep the
 *                                site's built-in cards.
 *   true with an empty array     rows exist but none is published; render the
 *                                empty state, because that is what somebody
 *                                chose.
 */
export interface PublicKbCategoryIndex {
  categories: PublicKbCategoryCard[];
  hasCategories: boolean;
}
