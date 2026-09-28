// src/modules/clients-page/validators/roster-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import { validateContentUrl } from '../../home-page/utils/content-url';
import {
  ClientsRosterLogoFilters,
  CreateClientsRosterLogoInput,
  ReorderClientsRosterLogosInput,
  UpdateClientsRosterLogoInput,
} from '../types/roster-section.types';

const NAME_MAX = 120;
const IMAGE_URL_MAX = 1000;

export function validateCreateClientsRosterLogo(body: unknown): CreateClientsRosterLogoInput {
  const v = validator(body);

  const imageUrl = v.nullableString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateContentUrl(v, 'imageUrl', imageUrl, 'INVALID_IMAGE_URL');
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors clients_roster_logos_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  // A marquee tile is its logo; an empty tile is worse than one logo fewer.
  v.custom(
    imageUrl !== null || imageFileId !== null,
    'imageFileId',
    'A logo needs an image: upload one or give an image URL',
    'REQUIRED',
  );

  const dto: CreateClientsRosterLogoInput = {
    name: v.requiredString('name', { min: 2, max: NAME_MAX }),
    imageUrl,
    imageFileId,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateClientsRosterLogo(body: unknown): UpdateClientsRosterLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['name', 'imageUrl', 'imageFileId', 'displayOrder', 'status']);

  // nullableString keeps the three states apart: absent leaves the value,
  // null or blank clears it, anything else sets it.
  const imageUrl = v.nullableString('imageUrl', { max: IMAGE_URL_MAX });
  if (imageUrl) validateContentUrl(v, 'imageUrl', imageUrl, 'INVALID_IMAGE_URL');
  const imageFileId = v.has('imageFileId') ? (v.optionalUuid('imageFileId') ?? null) : undefined;

  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  // Clearing both in one patch would leave the tile empty. Clearing one while
  // the other is stored is checked by the service, which can see the row.
  v.custom(
    !(imageUrl === null && imageFileId === null),
    'imageFileId',
    'A logo needs an image: upload one or give an image URL',
    'REQUIRED',
  );

  const dto: UpdateClientsRosterLogoInput = {
    name: v.has('name') ? v.requiredString('name', { min: 2, max: NAME_MAX }) : undefined,
    imageUrl,
    imageFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateClientsRosterLogoStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** The complete id list in its new order - a whole-set rewrite. */
export function validateReorderClientsRosterLogos(body: unknown): ReorderClientsRosterLogosInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_CLIENTS_ROSTER_LOGOS });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one id', 'REQUIRED');

  // uuidArray dedupes silently; compare against the raw length to catch it.
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

export function validateClientsRosterLogoListQuery(query: Record<string, unknown>): {
  filters: ClientsRosterLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ClientsRosterLogoFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
