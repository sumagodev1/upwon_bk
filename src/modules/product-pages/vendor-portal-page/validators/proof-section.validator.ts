// src/modules/product-pages/vendor-portal-page/validators/proof-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import { VMS_ICON_NAMES, VmsIconName, isVmsIconName } from '../utils/icons';
import {
  CreateVmsProofTileInput,
  ReorderInput,
  UpdateVmsProofTileInput,
  VMS_PROOF_DIRECTIONS,
  VMS_PROOF_TILE_KINDS,
  VmsProofTileFilters,
} from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const VALUE_MAX = 40;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 1200;
const IMAGE_ALT_MAX = 255;
const IMAGE_URL_MAX = 1000;

/** Mirrors vms_proof_tiles_col_span_check. */
const COL_SPAN_MIN = 3;
const COL_SPAN_MAX = 12;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render a question mark on the live page - the site
 * maps names to components through a fixed lookup - so this is the one place
 * that can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, field: string, raw: string | null): VmsIconName | null {
  if (!raw) return null;

  v.custom(
    isVmsIconName(raw),
    field,
    `${field} must be one of the available icons: ${VMS_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isVmsIconName(raw) ? raw : null;
}

/**
 * Creating a tile.
 *
 * `kind` is read first, because everything after it depends on the answer: a
 * METRIC needs its five fields and no picture, an IMAGE needs exactly one
 * source and none of the metric fields. Both rules mirror the per-kind CHECKs
 * the table carries, so a request that gets past here cannot be rejected by
 * the database for shape.
 */
export function validateCreateVmsProofTile(body: unknown): CreateVmsProofTileInput {
  const v = validator(body);

  const kind = v.requiredEnum('kind', VMS_PROOF_TILE_KINDS);
  const isMetric = kind === 'METRIC';

  const colSpan =
    v.optionalNumber('colSpan', {
      min: COL_SPAN_MIN,
      max: COL_SPAN_MAX,
      integer: true,
    }) ?? 4;

  // ── the metric half ──
  const icon = isMetric
    ? readIcon(v, 'icon', v.requiredString('icon', { min: 1, max: 60 }))
    : null;
  const value = isMetric ? v.requiredString('value', { min: 1, max: VALUE_MAX }) : null;
  const direction = isMetric ? v.requiredEnum('direction', VMS_PROOF_DIRECTIONS) : null;
  const title = isMetric ? v.requiredString('title', { min: 2, max: TITLE_MAX }) : null;
  const description = isMetric
    ? v.requiredString('description', { min: 10, max: DESCRIPTION_MAX })
    : null;

  // ── the picture half ──
  const imageUrl = isMetric ? null : (v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null);
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = isMetric ? null : (v.optionalUuid('imageFileId') ?? null);
  const imageAlt = isMetric
    ? null
    : (v.optionalString('imageAlt', { max: IMAGE_ALT_MAX }) ?? null);

  if (!isMetric) {
    v.custom(
      imageUrl === null || imageFileId === null,
      'imageUrl',
      'Provide either imageUrl or imageFileId, not both',
      'CONFLICTING_IMAGE_SOURCE',
    );
    v.custom(
      imageUrl !== null || imageFileId !== null,
      'imageUrl',
      'A picture tile needs its picture: give either imageUrl or imageFileId',
      'REQUIRED',
    );
  }

  /*
   * A metric tile's own fields are read above; the picture fields are simply
   * not read, so anything sent for them is dropped rather than rejected. That
   * is deliberate - an admin form that keeps both halves in state and posts
   * the lot should not fail because the unused half is populated.
   */

  const dto: CreateVmsProofTileInput = {
    kind,
    colSpan,
    icon,
    value,
    direction,
    title,
    description,
    imageUrl,
    imageFileId,
    imageAlt,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * Updating one.
 *
 * `kind` cannot be patched - changing a metric into a picture means clearing
 * five fields and requiring three others in the same request, and the result
 * is a different tile in every way but its id. The service rejects a body
 * that names one, because silently ignoring it would let an editor believe
 * the change took.
 *
 * Which fields are legal here still depends on the stored kind, and that is
 * not known until the row is read - so this validates shape and leaves the
 * per-kind rule to the service, which has the row.
 */
export function validateUpdateVmsProofTile(body: unknown): UpdateVmsProofTileInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'colSpan',
    'icon',
    'value',
    'direction',
    'title',
    'description',
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'displayOrder',
    'status',
  ]);

  const icon = v.has('icon')
    ? readIcon(v, 'icon', v.requiredString('icon', { min: 1, max: 60 }))
    : undefined;

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

  const dto: UpdateVmsProofTileInput = {
    colSpan: v.optionalNumber('colSpan', {
      min: COL_SPAN_MIN,
      max: COL_SPAN_MAX,
      integer: true,
    }),
    icon: icon ?? undefined,
    value: v.optionalString('value', { min: 1, max: VALUE_MAX }),
    direction: v.optionalEnum('direction', VMS_PROOF_DIRECTIONS),
    title: v.optionalString('title', { min: 2, max: TITLE_MAX }),
    description: v.optionalString('description', { min: 10, max: DESCRIPTION_MAX }),
    imageUrl,
    imageFileId,
    // `null` clears the alt text, which is legitimate for a decorative
    // picture; absent leaves it alone.
    imageAlt: v.has('imageAlt')
      ? (v.optionalString('imageAlt', { max: IMAGE_ALT_MAX }) ?? null)
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateVmsProofTileListQuery(query: Record<string, unknown>): {
  filters: VmsProofTileFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: VmsProofTileFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
    kind: v.optionalEnum('kind', VMS_PROOF_TILE_KINDS),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateVmsProofStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 *
 * It matters more here than on a plain list: the order is the bento's layout,
 * so a partial reorder does not just shuffle rows, it rearranges the grid.
 */
export function validateVmsProofTileReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_VMS_PROOF_TILES });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one tile id', 'REQUIRED');

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
