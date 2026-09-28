// src/modules/industry-pages/engineering-manufacturing-page/validators/capabilities-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import {
  ENGINEERING_ICON_NAMES,
  EngineeringIconName,
  isEngineeringIconName,
} from '../utils/icons';
import {
  CreateEngineeringCapabilityInput,
  EngineeringCapabilityFilters,
  ReorderEngineeringCapabilitiesInput,
  UpdateEngineeringCapabilityInput,
} from '../types/capabilities-section.types';

/**
 * Matched against the source text, so the limits are authoring limits. The
 * artwork's cards are small, so these are tighter than the database allows -
 * a longer title or description would spill out of its card on the artwork.
 */
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 160;

/** Mirrors engineering_capabilities_*_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** An unknown name would render a question mark on the live page. */
function readIcon(v: Validator, required: boolean): EngineeringIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isEngineeringIconName(raw),
    'icon',
    `icon must be one of the available icons: ${ENGINEERING_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isEngineeringIconName(raw) ? raw : undefined;
}

/** Six hex digits with a leading hash - what the site puts in a style attribute. */
function readColor(
  v: Validator,
  field: 'accentColor' | 'tintColor',
  required: boolean,
): string | undefined {
  if (!required && !v.has(field)) return undefined;

  const raw = required
    ? v.requiredString(field, { min: 7, max: 7 })
    : (v.optionalString(field, { max: 7 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    HEX_COLOR.test(raw),
    field,
    `${field} must be a six-digit hex colour, like #2F6FED`,
    'INVALID_COLOR',
  );

  return HEX_COLOR.test(raw) ? raw : undefined;
}

export function validateCreateEngineeringCapability(
  body: unknown,
): CreateEngineeringCapabilityInput {
  const v = validator(body);

  const dto: CreateEngineeringCapabilityInput = {
    title: v.requiredString('title', { min: 3, max: TITLE_MAX }),
    description: v.requiredString('description', { min: 3, max: DESCRIPTION_MAX }),
    icon: readIcon(v, true) as EngineeringIconName,
    accentColor: readColor(v, 'accentColor', true) as string,
    tintColor: readColor(v, 'tintColor', true) as string,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateEngineeringCapability(
  body: unknown,
): UpdateEngineeringCapabilityInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'title',
    'description',
    'icon',
    'accentColor',
    'tintColor',
    'displayOrder',
    'status',
  ]);

  const dto: UpdateEngineeringCapabilityInput = {
    title: v.has('title') ? v.requiredString('title', { min: 3, max: TITLE_MAX }) : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: 3, max: DESCRIPTION_MAX })
      : undefined,
    icon: readIcon(v, false),
    accentColor: readColor(v, 'accentColor', false),
    tintColor: readColor(v, 'tintColor', false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateEngineeringCapabilityStatus(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateReorderEngineeringCapabilities(
  body: unknown,
): ReorderEngineeringCapabilitiesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_ENGINEERING_CAPABILITIES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one id', 'REQUIRED');

  // uuidArray dedupes silently, which would turn a duplicated id into a
  // partial reorder. Compare against the raw length to catch it.
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

export function validateEngineeringCapabilityListQuery(query: Record<string, unknown>): {
  filters: EngineeringCapabilityFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: EngineeringCapabilityFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
