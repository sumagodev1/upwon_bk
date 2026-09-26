// src/modules/about-page/validators/number-stats.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import {
  AboutNumberStatFilters,
  CreateAboutNumberStatInput,
  ReorderAboutNumberStatsInput,
  UpdateAboutNumberStatInput,
} from '../types/numbers.types';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin form's counters are written against and the ones
 * 026_about_page_numbers.sql sizes its columns to. Changing one means changing
 * all three.
 */
const VALUE_MIN = 1;
const VALUE_MAX = 20;
const LABEL_MIN = 2;
const LABEL_MAX = 120;
const DESCRIPTION_MIN = 2;
const DESCRIPTION_MAX = 200;

/**
 * The big number has to start with a digit.
 *
 * The card animates a count-up over the leading digits and prints whatever
 * follows them in orange, so a value with no digits at all ('Lots', '+') renders
 * as a blank card with a suffix floating in it. Everything after the digits is
 * free - '+', '%', ' Cr', '/7' - because that is the part the page varies, and
 * the digits may carry the separators a number is written with ('16,500+').
 *
 * Checked here rather than by a CHECK constraint: this reports which field is
 * wrong to the admin who can fix it, and the rule is a rendering fact about one
 * component rather than a truth about the column.
 */
const VALUE_SHAPE = /^[0-9][0-9.,]*/;

function validateStatValue(v: Validator, field: string, value: string): void {
  v.custom(
    VALUE_SHAPE.test(value),
    field,
    `${field} must start with a number, as in '150+', '98%' or '7'`,
    'INVALID_STAT_VALUE',
  );
}

export function validateCreateAboutNumberStat(body: unknown): CreateAboutNumberStatInput {
  const v = validator(body);

  const value = v.requiredString('value', { min: VALUE_MIN, max: VALUE_MAX });
  if (value) validateStatValue(v, 'value', value);

  const dto: CreateAboutNumberStatInput = {
    value,
    label: v.requiredString('label', { min: LABEL_MIN, max: LABEL_MAX }),
    description: v.requiredString('description', {
      min: DESCRIPTION_MIN,
      max: DESCRIPTION_MAX,
    }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * A full edit of one card.
 *
 * displayOrder is not here and has no input in the form: position is changed
 * with the reorder arrows - see the team member validator.
 */
export function validateUpdateAboutNumberStat(body: unknown): UpdateAboutNumberStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'description', 'status']);

  const value = v.optionalString('value', { min: VALUE_MIN, max: VALUE_MAX });
  if (value) validateStatValue(v, 'value', value);

  const dto: UpdateAboutNumberStatInput = {
    value,
    label: v.optionalString('label', { min: LABEL_MIN, max: LABEL_MAX }),
    description: v.optionalString('description', {
      min: DESCRIPTION_MIN,
      max: DESCRIPTION_MAX,
    }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Publish / unpublish, kept separate from the edit form's save. */
export function validateAboutNumberStatStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** Every card's id, in its new order - a whole-set rewrite. */
export function validateReorderAboutNumberStats(
  body: unknown,
): ReorderAboutNumberStatsInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_ABOUT_NUMBER_STATS });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one stat id', 'REQUIRED');

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
export function validateAboutNumberStatListQuery(
  query: Record<string, unknown>,
): AboutNumberStatFilters {
  const v = validator(query);
  const filters: AboutNumberStatFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
    search: v.optionalString('search', { max: 120 }),
  };
  v.assert();
  return filters;
}
