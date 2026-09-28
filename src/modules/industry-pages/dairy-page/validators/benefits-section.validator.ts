// src/modules/industry-pages/dairy-page/validators/benefits-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { isDairyIconName, DAIRY_ICON_NAMES } from '../utils/icons';
import { readImagePair, validateReorderIds, validateStatusBody } from '../utils/list-validation';
import {
  CreateDairyBenefitItemInput,
  DairyBenefitItemFilters,
  ReorderDairyBenefitItemsInput,
  UpsertDairyBenefitsPanelInput,
  UpdateDairyBenefitItemInput,
} from '../types/benefits-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 600;
const IMAGE = { url: 'imageUrl', fileId: 'imageFileId' };

/** The icon is a name from the allowlist the site can draw, not a file. */
function checkIcon(v: Validator, icon: string | undefined): void {
  if (!icon) return;
  v.custom(
    isDairyIconName(icon),
    'icon',
    `icon must be one of: ${DAIRY_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );
}

export function validateCreateDairyBenefitItem(body: unknown): CreateDairyBenefitItemInput {
  const v = validator(body);
  const icon = v.requiredString('icon', { min: 1, max: 60 });
  checkIcon(v, icon);

  const dto: CreateDairyBenefitItemInput = {
    icon,
    title: v.requiredString('title', { min: 3, max: TITLE_MAX }),
    description: v.requiredString('description', { min: 10, max: DESCRIPTION_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateDairyBenefitItem(body: unknown): UpdateDairyBenefitItemInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'title', 'description', 'displayOrder', 'status']);
  const icon = v.has('icon') ? v.requiredString('icon', { min: 1, max: 60 }) : undefined;
  checkIcon(v, icon);

  const dto: UpdateDairyBenefitItemInput = {
    icon,
    title: v.has('title')
      ? v.requiredString('title', { min: 3, max: TITLE_MAX })
      : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: 10, max: DESCRIPTION_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export const validateDairyBenefitItemStatus = validateStatusBody;

export const validateReorderDairyBenefitItems = (body: unknown): ReorderDairyBenefitItemsInput =>
  validateReorderIds(body, LIMITS.MAX_DAIRY_BENEFIT_ITEMS);

export function validateDairyBenefitItemListQuery(query: Record<string, unknown>): {
  filters: DairyBenefitItemFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: DairyBenefitItemFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the panel image ───────────────────────────────────────────────────────

export function validateUpsertDairyBenefitsPanel(body: unknown): UpsertDairyBenefitsPanelInput {
  const v = validator(body);
  const image = readImagePair(v, IMAGE, { required: true, partial: false, noun: 'The panel' });

  const dto: UpsertDairyBenefitsPanelInput = {
    imageUrl: image.url ?? null,
    imageFileId: image.fileId ?? null,
    // A description a screen reader can use, not a filename.
    alt: v.requiredString('alt', { min: 5, max: 255 }),
  };

  v.assert();
  return dto;
}
