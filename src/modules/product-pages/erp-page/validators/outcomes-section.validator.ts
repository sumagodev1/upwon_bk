// src/modules/product-pages/erp-page/validators/outcomes-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateErpOutcomeCardInput,
  ErpOutcomeCardFilters,
  UpdateErpOutcomeCardInput,
} from '../types/outcomes-section.types';
import { ReorderInput } from '../types/recognition-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const INDUSTRY_MAX = 120;
const STAT_MAX = 60;
const STAT_LABEL_MAX = 255;
const QUOTE_MAX = 600;
const AUTHOR_MAX = 160;
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;

/**
 * Strips the quotation marks a card draws for itself.
 *
 * An editor pasting a quote almost always brings the marks with it, and the
 * card wraps whatever it is given in curly quotes - so leaving them would show
 * two sets. Handled here rather than in the component, which should print what
 * it is handed.
 */
function stripQuoteMarks(value: string): string {
  return value.replace(/^["“‘']+|["”’']+$/g, '').trim();
}

function readQuote(v: Validator, required: boolean): string | undefined {
  if (!required && !v.has('quote')) return undefined;
  const raw = v.requiredString('quote', { min: 3, max: QUOTE_MAX });
  if (!raw) return undefined;

  const stripped = stripQuoteMarks(raw);
  v.custom(stripped.length >= 3, 'quote', 'quote must be at least 3 characters', 'TOO_SHORT');
  return stripped;
}

export function validateCreateErpOutcomeCard(body: unknown): CreateErpOutcomeCardInput {
  const v = validator(body);

  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors erp_outcome_cards_single_image_source_check.
  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  // Mirrors erp_outcome_cards_image_required_check.
  v.custom(
    imageUrl !== null || imageFileId !== null,
    'imageFileId',
    'A card needs a photograph: upload one or give an image URL',
    'REQUIRED',
  );

  const dto: CreateErpOutcomeCardInput = {
    industry: v.requiredString('industry', { min: 2, max: INDUSTRY_MAX }),
    stat: v.requiredString('stat', { min: 1, max: STAT_MAX }),
    statLabel: v.requiredString('statLabel', { min: 3, max: STAT_LABEL_MAX }),
    quote: readQuote(v, true) as string,
    authorRole: v.requiredString('authorRole', { min: 2, max: AUTHOR_MAX }),
    authorCompany: v.requiredString('authorCompany', { min: 2, max: AUTHOR_MAX }),
    imageUrl,
    imageFileId,
    imageAlt: v.optionalString('imageAlt', { max: ALT_MAX }) ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpOutcomeCard(body: unknown): UpdateErpOutcomeCardInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'industry',
    'stat',
    'statLabel',
    'quote',
    'authorRole',
    'authorCompany',
    'imageUrl',
    'imageFileId',
    'imageAlt',
    'displayOrder',
    'status',
  ]);

  // `null` clears the field; `undefined` (absent) leaves it alone.
  const imageUrl = v.has('imageUrl')
    ? (v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.has('imageFileId') ? (v.optionalUuid('imageFileId') ?? null) : undefined;

  v.custom(
    !(imageUrl && imageFileId),
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  /*
   * Clearing both at once would leave the card with no photograph, which the
   * CHECK rejects. Clearing one while the other is already stored is fine and
   * is resolved in the repository, which can see the current row.
   */
  v.custom(
    !(imageUrl === null && imageFileId === null),
    'imageFileId',
    'A card needs a photograph: upload one or give an image URL',
    'REQUIRED',
  );

  const dto: UpdateErpOutcomeCardInput = {
    industry: v.has('industry')
      ? v.requiredString('industry', { min: 2, max: INDUSTRY_MAX })
      : undefined,
    stat: v.has('stat') ? v.requiredString('stat', { min: 1, max: STAT_MAX }) : undefined,
    statLabel: v.has('statLabel')
      ? v.requiredString('statLabel', { min: 3, max: STAT_LABEL_MAX })
      : undefined,
    quote: readQuote(v, false),
    authorRole: v.has('authorRole')
      ? v.requiredString('authorRole', { min: 2, max: AUTHOR_MAX })
      : undefined,
    authorCompany: v.has('authorCompany')
      ? v.requiredString('authorCompany', { min: 2, max: AUTHOR_MAX })
      : undefined,
    imageUrl,
    imageFileId,
    imageAlt: v.has('imageAlt')
      ? (v.optionalString('imageAlt', { max: ALT_MAX }) ?? null)
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
export function validateErpOutcomeReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_ERP_OUTCOME_CARDS });

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

export function validateErpOutcomeCardListQuery(query: Record<string, unknown>): {
  filters: ErpOutcomeCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ErpOutcomeCardFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
