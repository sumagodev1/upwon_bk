// src/modules/product-pages/wms-page/validators/outcomes-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { WMS_ICON_NAMES, WmsIconName, isWmsIconName } from '../utils/icons';
import {
  CreateWmsOutcomeCardInput,
  ReorderInput,
  UpdateWmsOutcomeCardInput,
  WMS_OUTCOME_ACCENTS,
  WmsOutcomeCardFilters,
} from '../types/outcomes-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const STAT_MAX = 40;
const TITLE_MAX = 160;
const DESCRIPTION_MAX = 300;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render a question mark on the live page - the site
 * maps names to components through a fixed lookup - so this is the one place
 * that can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, required: boolean): WmsIconName | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = required
    ? v.requiredString('icon', { min: 1, max: 60 })
    : (v.optionalString('icon', { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isWmsIconName(raw),
    'icon',
    `icon must be one of the available icons: ${WMS_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isWmsIconName(raw) ? raw : undefined;
}

export function validateCreateWmsOutcomeCard(body: unknown): CreateWmsOutcomeCardInput {
  const v = validator(body);

  const dto: CreateWmsOutcomeCardInput = {
    icon: readIcon(v, true) as WmsIconName,
    /*
     * The figure as it should read, punctuation and all - "15-20%", "99%+".
     * Deliberately not parsed into a number: the card prints this string, and
     * a range or a qualifier is not a number to begin with.
     */
    stat: v.requiredString('stat', { min: 1, max: STAT_MAX }),
    title: v.requiredString('title', { min: 2, max: TITLE_MAX }),
    /*
     * Required: a card is a figure, what it measures and how the system gets
     * there. Without the last one the row is a wall of percentages a visitor
     * has no reason to believe.
     */
    description: v.requiredString('description', { min: 10, max: DESCRIPTION_MAX }),
    // Defaulted rather than required: it reaches one hover rule, and an
    // editor who does not care should not have to choose.
    accent: v.optionalEnum('accent', WMS_OUTCOME_ACCENTS) ?? 'orange',
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateWmsOutcomeCard(body: unknown): UpdateWmsOutcomeCardInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'icon',
    'stat',
    'title',
    'description',
    'accent',
    'displayOrder',
    'status',
  ]);

  const dto: UpdateWmsOutcomeCardInput = {
    icon: readIcon(v, false),
    stat: v.optionalString('stat', { min: 1, max: STAT_MAX }),
    title: v.optionalString('title', { min: 2, max: TITLE_MAX }),
    description: v.optionalString('description', { min: 10, max: DESCRIPTION_MAX }),
    accent: v.optionalEnum('accent', WMS_OUTCOME_ACCENTS),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateWmsOutcomeCardListQuery(query: Record<string, unknown>): {
  filters: WmsOutcomeCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: WmsOutcomeCardFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateWmsOutcomeStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates,
 * which a "move card X to position N" endpoint can when two admins drag at
 * once.
 */
export function validateWmsOutcomeCardReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_WMS_OUTCOME_CARDS });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one card id', 'REQUIRED');

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
