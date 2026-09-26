// src/modules/blog/validators/categories.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { validator } from '../../../core/utils/validation';
import {
  BlogCategoryFilters,
  CreateBlogCategoryInput,
  ReorderBlogCategoriesInput,
  UpdateBlogCategoryInput,
} from '../types/categories.types';
import { readBlogCategoryIcon } from './shared';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin form's counters are written against and the ones 049_blog.sql sizes its
 * columns to. Changing one means changing all three.
 *
 * The label is a chip's text - 'Food Manufacturing & ERP' is the longest the
 * site ships, at 24.
 *
 * There is no slug here, on create or on update: it is an internal key the
 * service derives from the label when the category is created and never
 * changes afterwards (see categoriesService.create). A slug a client still
 * sends is ignored like any other unknown key.
 */
const LABEL_MIN = 2;
const LABEL_MAX = 60;

export function validateCreateBlogCategory(body: unknown): CreateBlogCategoryInput {
  const v = validator(body);

  const dto: CreateBlogCategoryInput = {
    label: v.requiredString('label', { min: LABEL_MIN, max: LABEL_MAX }),
    icon: readBlogCategoryIcon(v, true) as string,
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * A partial edit of one category.
 *
 * displayOrder is not here and has no input in the form: position is changed
 * with the reorder arrows, which rewrite the whole set at once.
 */
export function validateUpdateBlogCategory(body: unknown): UpdateBlogCategoryInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'icon', 'status']);

  const dto: UpdateBlogCategoryInput = {
    label: v.has('label')
      ? v.requiredString('label', { min: LABEL_MIN, max: LABEL_MAX })
      : undefined,
    icon: readBlogCategoryIcon(v, false),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Publish / unpublish, kept separate from the edit form's save. */
export function validateBlogCategoryStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** Every category's id, in its new order - a whole-set rewrite. */
export function validateReorderBlogCategories(body: unknown): ReorderBlogCategoriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_BLOG_CATEGORIES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one category id', 'REQUIRED');

  // uuidArray dedupes silently; a duplicated id would become a partial reorder
  // with two rows fighting over one position.
  const raw = (body as { ids?: unknown } | null)?.ids;
  v.custom(
    !Array.isArray(raw) || raw.length === ids.length,
    'ids',
    'ids must not contain duplicates',
    'DUPLICATE_IDS',
  );

  v.assert();
  return { ids };
}

/** The admin list: a search box and a status filter, no paging. */
export function validateBlogCategoryListQuery(
  query: Record<string, unknown>,
): BlogCategoryFilters {
  const v = validator(query);
  const filters: BlogCategoryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
    search: v.optionalString('search', { max: 120 }),
  };
  v.assert();
  return filters;
}
