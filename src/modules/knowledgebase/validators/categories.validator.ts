// src/modules/knowledgebase/validators/categories.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { validator } from '../../../core/utils/validation';
import {
  CreateKbCategoryInput,
  KbCategoryFilters,
  ReorderKbCategoriesInput,
  UpdateKbCategoryInput,
} from '../types/categories.types';
import { readKbCategoryIcon } from './shared';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin form's counters are written against and the ones 052_knowledgebase.sql
 * sizes its columns to. Changing one means changing all three.
 *
 * The name is a card's title and a page's headline - 'Compliance & Food
 * Safety' is the longest the site ships, at 24. The description is the card's
 * paragraph and the category page's standfirst; the longest shipped is about
 * 115 characters.
 *
 * There is no slug here, on create or on update: it is the category's URL
 * segment, which the service derives from the name when the category is
 * created and never changes afterwards (see categoriesService.create). A slug
 * a client still sends is ignored like any other unknown key.
 */
const NAME_MIN = 2;
const NAME_MAX = 80;
const DESCRIPTION_MIN = 3;
const DESCRIPTION_MAX = 300;

export function validateCreateKbCategory(body: unknown): CreateKbCategoryInput {
  const v = validator(body);

  const dto: CreateKbCategoryInput = {
    name: v.requiredString('name', { min: NAME_MIN, max: NAME_MAX }),
    description: v.requiredString('description', { min: DESCRIPTION_MIN, max: DESCRIPTION_MAX }),
    icon: readKbCategoryIcon(v, true) as string,
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
export function validateUpdateKbCategory(body: unknown): UpdateKbCategoryInput {
  const v = validator(body);

  v.requireAtLeastOne(['name', 'description', 'icon', 'status']);

  const dto: UpdateKbCategoryInput = {
    name: v.has('name') ? v.requiredString('name', { min: NAME_MIN, max: NAME_MAX }) : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: DESCRIPTION_MIN, max: DESCRIPTION_MAX })
      : undefined,
    icon: readKbCategoryIcon(v, false),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Publish / unpublish, kept separate from the edit form's save. */
export function validateKbCategoryStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** Every category's id, in its new order - a whole-set rewrite. */
export function validateReorderKbCategories(body: unknown): ReorderKbCategoriesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_KB_CATEGORIES });

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
export function validateKbCategoryListQuery(query: Record<string, unknown>): KbCategoryFilters {
  const v = validator(query);
  // A filter bar may send either as '' for "any" - read as absent rather than
  // answered with a REQUIRED error, as the article list reads its filters.
  const filters: KbCategoryFilters = {
    status: v.nullableString('status') ? v.requiredEnum('status', CONTENT_STATUSES) : undefined,
    search: v.nullableString('search', { max: 120 }) ?? undefined,
  };
  v.assert();
  return filters;
}
