// src/modules/blog/types/categories.types.ts

import { ContentStatus } from '../../../config/constants';

/**
 * One topic chip on /blog ('Food Manufacturing & ERP'), exactly as stored.
 *
 * Posts are filed under exactly one category each, by id; the public side
 * names a post's category by its slug instead, the way data/blog.js always has
 * ('food-mfg'), so a built-in post and a fetched one are interchangeable at the
 * render site.
 */
export interface BlogCategory {
  id: string;
  /**
   * A stable key ('food-mfg'). Unique. Never an input: derived from the label
   * when the category is created, and never changed by an edit - relabelling a
   * chip does not rename the key its posts are matched on.
   */
  slug: string;
  label: string;
  /** A name from BLOG_CATEGORY_ICON_NAMES. */
  icon: string;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The admin row: a category plus how many posts are filed under it, of any
 * status. The count is what tells an administrator, before they try, that a
 * delete will be refused (BLOG_CATEGORY_IN_USE).
 */
export interface BlogCategorySummary extends BlogCategory {
  postCount: number;
}

/** POST body. No slug: the service derives it from the label. */
export interface CreateBlogCategoryInput {
  label: string;
  icon: string;
  status: ContentStatus;
}

/**
 * Absent leaves a field untouched. No column here is nullable. No slug: it is
 * fixed when the category is created.
 */
export interface UpdateBlogCategoryInput {
  label?: string;
  icon?: string;
  status?: ContentStatus;
}

/** Every category id, in the order they should end up in. */
export interface ReorderBlogCategoriesInput {
  ids: string[];
}

export interface BlogCategoryFilters {
  status?: ContentStatus;
  search?: string;
}

/**
 * The website-facing shape of one chip: the slug posts are matched on, the
 * label, the icon name, and the number the chip prints - ACTIVE posts only,
 * because that is how many a reader finds when they click it. No id, status or
 * order: an INACTIVE category is simply absent, and the array's order is the
 * display order.
 */
export interface PublicBlogCategory {
  slug: string;
  label: string;
  icon: string;
  count: number;
}
