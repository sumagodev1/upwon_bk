// src/modules/product-pages/erp-page/validators/establishers-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { ERP_ICON_NAMES, ErpIconName, isErpIconName } from '../utils/icons';
import {
  CreateErpEstablisherBadgeInput,
  ErpEstablisherBadgeFilters,
  UpdateErpEstablisherBadgeInput,
} from '../types/establishers-section.types';
import { ReorderInput } from '../types/recognition-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const TITLE_MAX = 160;
const SUBTEXT_MAX = 255;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render nothing at all on the live page - the site maps
 * names to components through a fixed lookup - so this is the one place that
 * can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, required: boolean): ErpIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isErpIconName(raw),
    'icon',
    `icon must be one of the available icons: ${ERP_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isErpIconName(raw) ? raw : undefined;
}

export function validateCreateErpEstablisherBadge(
  body: unknown,
): CreateErpEstablisherBadgeInput {
  const v = validator(body);

  const dto: CreateErpEstablisherBadgeInput = {
    icon: readIcon(v, true) as ErpIconName,
    title: v.requiredString('title', { min: 2, max: TITLE_MAX }),
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpEstablisherBadge(
  body: unknown,
): UpdateErpEstablisherBadgeInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'title', 'subtext', 'displayOrder', 'status']);

  const dto: UpdateErpEstablisherBadgeInput = {
    icon: readIcon(v, false),
    title: v.has('title') ? v.requiredString('title', { min: 2, max: TITLE_MAX }) : undefined,
    subtext: v.has('subtext')
      ? v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateErpEstablisherReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_ERP_ESTABLISHER_BADGES });

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

export function validateErpEstablisherBadgeListQuery(query: Record<string, unknown>): {
  filters: ErpEstablisherBadgeFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ErpEstablisherBadgeFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
