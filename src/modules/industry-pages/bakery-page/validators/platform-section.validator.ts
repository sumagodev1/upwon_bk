// src/modules/industry-pages/bakery-page/validators/platform-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator } from '../../../../core/utils/validation';
import { validateLinkHref } from '../utils/link';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  BakeryPlatformTileFilters,
  CreateBakeryPlatformTileInput,
  ReorderBakeryPlatformTilesInput,
  UpdateBakeryPlatformTileInput,
} from '../types/platform-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 80;
const HREF_MAX = 500;

const TILE_ICON = { url: 'iconUrl', fileId: 'iconFileId' };

export function validateCreateBakeryPlatformTile(body: unknown): CreateBakeryPlatformTileInput {
  const v = validator(body);
  const icon = readImagePair(v, TILE_ICON, { required: true, partial: false, noun: 'A tile' });

  const href = v.requiredString('href', { min: 1, max: HREF_MAX });
  if (href) validateLinkHref(v, 'href', href);

  const dto: CreateBakeryPlatformTileInput = {
    label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
    href,
    iconUrl: icon.url ?? null,
    iconFileId: icon.fileId ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateBakeryPlatformTile(body: unknown): UpdateBakeryPlatformTileInput {
  const v = validator(body);

  v.requireAtLeastOne(['label', 'href', 'iconUrl', 'iconFileId', 'displayOrder', 'status']);
  const icon = readImagePair(v, TILE_ICON, { required: true, partial: true, noun: 'A tile' });

  const href = v.has('href') ? v.requiredString('href', { min: 1, max: HREF_MAX }) : undefined;
  if (href) validateLinkHref(v, 'href', href);

  const dto: UpdateBakeryPlatformTileInput = {
    label: v.has('label') ? v.requiredString('label', { min: 2, max: LABEL_MAX }) : undefined,
    href,
    iconUrl: icon.url,
    iconFileId: icon.fileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export const validateBakeryPlatformTileStatus = validateStatusBody;

export const validateReorderBakeryPlatformTiles = (
  body: unknown,
): ReorderBakeryPlatformTilesInput => validateReorderIds(body, LIMITS.MAX_BAKERY_PLATFORM_TILES);

export function validateBakeryPlatformTileListQuery(query: Record<string, unknown>): {
  filters: BakeryPlatformTileFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: BakeryPlatformTileFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
