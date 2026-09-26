// src/modules/vs-sap-page/validators/capabilities.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { validator, Validator } from '../../../core/utils/validation';
import {
  CreateVsSapCapabilityInput,
  ReorderVsSapCapabilitiesInput,
  UpdateVsSapCapabilityInput,
  VsSapCapabilityFilters,
} from '../types/comparison.types';

/**
 * Authoring limits, matched against the trimmed text. These are the numbers the
 * admin form's counters are written against and the ones 053_vs_sap_page.sql
 * sizes its columns to. Changing one means changing all three.
 */
const CAPABILITY_MIN = 2;
const CAPABILITY_MAX = 120;

/**
 * A rating is a whole number of stars out of five, and 0 is "not available
 * natively" - the site draws a dash for it. vs_sap_capabilities_rating_range_check
 * restates the range; this reports which column is wrong.
 */
const RATING_MIN = 0;
const RATING_MAX = 5;

/** The three rated columns, in the order the table draws them. */
const RATING_FIELDS = ['upwon', 'sap', 'netsuite'] as const;

const readRating = (v: Validator, field: string): number =>
  v.requiredNumber(field, { min: RATING_MIN, max: RATING_MAX, integer: true });

const readOptionalRating = (v: Validator, field: string): number | undefined =>
  v.optionalNumber(field, { min: RATING_MIN, max: RATING_MAX, integer: true });

export function validateCreateVsSapCapability(body: unknown): CreateVsSapCapabilityInput {
  const v = validator(body);

  const dto: CreateVsSapCapabilityInput = {
    capability: v.requiredString('capability', { min: CAPABILITY_MIN, max: CAPABILITY_MAX }),
    upwon: readRating(v, 'upwon'),
    sap: readRating(v, 'sap'),
    netsuite: readRating(v, 'netsuite'),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * A full edit of one row.
 *
 * displayOrder is not here and has no input in the form: position is changed
 * with the reorder arrows - see the About page's stat card validator.
 */
export function validateUpdateVsSapCapability(body: unknown): UpdateVsSapCapabilityInput {
  const v = validator(body);

  v.requireAtLeastOne(['capability', ...RATING_FIELDS, 'status']);

  const dto: UpdateVsSapCapabilityInput = {
    capability: v.optionalString('capability', { min: CAPABILITY_MIN, max: CAPABILITY_MAX }),
    upwon: readOptionalRating(v, 'upwon'),
    sap: readOptionalRating(v, 'sap'),
    netsuite: readOptionalRating(v, 'netsuite'),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/** Publish / unpublish, kept separate from the edit form's save. */
export function validateVsSapCapabilityStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** Every row's id, in its new order - a whole-set rewrite. */
export function validateReorderVsSapCapabilities(
  body: unknown,
): ReorderVsSapCapabilitiesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_VS_SAP_CAPABILITIES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one capability id', 'REQUIRED');

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
export function validateVsSapCapabilityListQuery(
  query: Record<string, unknown>,
): VsSapCapabilityFilters {
  const v = validator(query);
  const filters: VsSapCapabilityFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
    search: v.optionalString('search', { max: 120 }),
  };
  v.assert();
  return filters;
}
