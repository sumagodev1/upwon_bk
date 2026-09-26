// src/modules/product-pages/hreasy-page/validators/capabilities-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateHreasyCapabilityModuleInput,
  HreasyCapabilityModuleFilters,
  ReorderHreasyCapabilityModulesInput,
  UpdateHreasyCapabilityModuleInput,
} from '../types/capabilities-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const NAME_MAX = 160;
const SLUG_MAX = 80;
const IMAGE_URL_MAX = 1000;

/**
 * A slug is lowercase words joined by single hyphens.
 *
 * Mirrors hreasy_capability_modules_slug_format_check. Checked rather than
 * generated from the name: the site keys its selected row on it, so it has to
 * survive a rename, which means an author owns it.
 */
function checkSlug(v: Validator, slug: string): void {
  v.custom(
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug),
    'slug',
    'slug must be lowercase letters, digits and single hyphens - like attendance-leave',
    'INVALID_SLUG',
  );
}

export function validateCreateHreasyCapabilityModule(
  body: unknown,
): CreateHreasyCapabilityModuleInput {
  const v = validator(body);

  const slug = v.requiredString('slug', { min: 2, max: SLUG_MAX });
  if (slug) checkSlug(v, slug);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  /*
   * Mirrors hreasy_capability_modules_image_required_check: exactly one
   * source. Both at once is ambiguous about which the site should draw, and
   * neither leaves the right-hand side of the section empty - which is the
   * whole panel, not a decoration on it.
   */
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    imageUrl !== null || imageFileId !== null,
    'imageUrl',
    'A module needs its panel artwork: give either imageUrl or imageFileId',
    'REQUIRED',
  );

  const dto: CreateHreasyCapabilityModuleInput = {
    name: v.requiredString('name', { min: 2, max: NAME_MAX }),
    slug,
    imageUrl,
    imageFileId,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateHreasyCapabilityModule(
  body: unknown,
): UpdateHreasyCapabilityModuleInput {
  const v = validator(body);

  v.requireAtLeastOne(['name', 'slug', 'imageUrl', 'imageFileId', 'displayOrder', 'status']);

  const slug = v.has('slug') ? v.requiredString('slug', { min: 2, max: SLUG_MAX }) : undefined;
  if (slug) checkSlug(v, slug);

  /*
   * The artwork is required by CHECK, so neither half may be cleared on its
   * own - a patch either names a replacement or leaves the pair alone. Hence
   * `requiredString` rather than the nullable read an optional image takes.
   */
  const imageUrl = v.has('imageUrl')
    ? v.requiredString('imageUrl', { min: 1, max: IMAGE_URL_MAX })
    : undefined;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);

  const imageFileId = v.has('imageFileId') ? v.requiredUuid('imageFileId') : undefined;

  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateHreasyCapabilityModuleInput = {
    name: v.optionalString('name', { min: 2, max: NAME_MAX }),
    slug,
    imageUrl,
    imageFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateHreasyCapabilityModuleStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move module X to position N" endpoint can when two admins drag at once.
 */
export function validateReorderHreasyCapabilityModules(
  body: unknown,
): ReorderHreasyCapabilityModulesInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_HREASY_CAPABILITY_MODULES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one module id', 'REQUIRED');

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

export function validateHreasyCapabilityModuleListQuery(query: Record<string, unknown>): {
  filters: HreasyCapabilityModuleFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: HreasyCapabilityModuleFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
