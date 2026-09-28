// src/modules/product-pages/wms-page/validators/capabilities-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateWmsCapabilityModuleInput,
  ReorderInput,
  UpdateWmsCapabilityModuleInput,
  WmsCapabilityModuleFilters,
} from '../types/capabilities-section.types';

/**
 * Matched against the source text, so the limits are authoring limits.
 *
 * The description column is TEXT rather than bounded - a band is full width
 * and a longer paragraph only makes its own band taller - so this ceiling is
 * editorial rather than structural. The longest shipped paragraph is 231
 * characters; 600 leaves room to expand one without turning a scannable band
 * into an essay.
 */
const TITLE_MAX = 160;
const DESCRIPTION_MAX = 600;
const IMAGE_ALT_MAX = 255;
const IMAGE_URL_MAX = 1000;

export function validateCreateWmsCapabilityModule(
  body: unknown,
): CreateWmsCapabilityModuleInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  /*
   * Mirrors wms_capability_modules_image_required_check: exactly one source.
   * Both at once is ambiguous about which the site should draw, and neither
   * leaves the band a paragraph with a hole next to it.
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
    'A capability needs its artwork: give either imageUrl or imageFileId',
    'REQUIRED',
  );

  const dto: CreateWmsCapabilityModuleInput = {
    title: v.requiredString('title', { min: 2, max: TITLE_MAX }),
    /*
     * Required: the band is a name, what the capability does and a picture.
     * Without the paragraph it is a heading floating beside artwork, and the
     * heading alone does not say what the capability is for.
     */
    description: v.requiredString('description', { min: 10, max: DESCRIPTION_MAX }),
    imageUrl,
    imageFileId,
    /*
     * Optional, and null rather than blank: the heading and paragraph beside
     * it already name the capability, so the composite is usually decorative
     * and an empty alt is the correct markup for it.
     */
    imageAlt: v.optionalString('imageAlt', { max: IMAGE_ALT_MAX }) ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateWmsCapabilityModule(
  body: unknown,
): UpdateWmsCapabilityModuleInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'title',
    'description',
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'displayOrder',
    'status',
  ]);

  /*
   * The artwork is required by CHECK, so neither half may be cleared on its
   * own - a patch either names a replacement or leaves the pair alone. Hence
   * `requiredString` rather than the nullable read the alt text takes.
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

  const dto: UpdateWmsCapabilityModuleInput = {
    title: v.optionalString('title', { min: 2, max: TITLE_MAX }),
    description: v.optionalString('description', { min: 10, max: DESCRIPTION_MAX }),
    imageUrl,
    imageFileId,
    // `null` clears the alt text, which is a legitimate state for a purely
    // decorative composite; absent leaves it alone.
    imageAlt: v.has('imageAlt')
      ? (v.optionalString('imageAlt', { max: IMAGE_ALT_MAX }) ?? null)
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateWmsCapabilityModuleListQuery(query: Record<string, unknown>): {
  filters: WmsCapabilityModuleFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: WmsCapabilityModuleFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateWmsCapabilityStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates,
 * which a "move band X to position N" endpoint can when two admins drag at
 * once.
 */
export function validateWmsCapabilityModuleReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_WMS_CAPABILITY_MODULES });

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
