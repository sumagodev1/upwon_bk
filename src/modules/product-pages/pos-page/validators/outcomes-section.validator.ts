// src/modules/product-pages/pos-page/validators/outcomes-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import {
  CreatePosOutcomeStoryInput,
  PosOutcomeStoryFilters,
  ReorderInput,
  UpdatePosOutcomeStoryInput,
} from '../types/outcomes-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const NAME_MAX = 160;
const SLUG_MAX = 80;
const MEDIA_URL_MAX = 1000;
const QUOTE_MAX = 600;
const PERSON_MAX = 160;
const LINK_LABEL_MAX = 120;
const LINK_HREF_MAX = 500;

/**
 * A slug is lowercase words joined by single hyphens.
 *
 * Mirrors pos_outcome_stories_slug_format_check. Checked rather than generated
 * from the name: it is what a deep link points at, so it has to survive a
 * rename, which means an author owns it.
 */
function checkSlug(v: Validator, slug: string): void {
  v.custom(
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug),
    'slug',
    'slug must be lowercase letters, digits and single hyphens - like u2-cake',
    'INVALID_SLUG',
  );
}

export function validateCreatePosOutcomeStory(body: unknown): CreatePosOutcomeStoryInput {
  const v = validator(body);

  const slug = v.requiredString('slug', { min: 2, max: SLUG_MAX });
  if (slug) checkSlug(v, slug);

  const logoUrl = v.optionalString('logoUrl', { max: MEDIA_URL_MAX }) ?? null;
  if (logoUrl) validateMediaUrl(v, 'logoUrl', logoUrl);
  const logoFileId = v.optionalUuid('logoFileId') ?? null;

  // Mirrors pos_outcome_stories_single_logo_source_check.
  v.custom(
    logoUrl === null || logoFileId === null,
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  // Mirrors pos_outcome_stories_logo_required_check.
  v.custom(
    logoUrl !== null || logoFileId !== null,
    'logoFileId',
    'A story needs a brand mark: upload one or give an image URL',
    'REQUIRED',
  );

  const photoUrl = v.optionalString('photoUrl', { max: MEDIA_URL_MAX }) ?? null;
  if (photoUrl) validateMediaUrl(v, 'photoUrl', photoUrl);
  const photoFileId = v.optionalUuid('photoFileId') ?? null;

  v.custom(
    photoUrl === null || photoFileId === null,
    'photoUrl',
    'Provide either photoUrl or photoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    photoUrl !== null || photoFileId !== null,
    'photoFileId',
    'A story needs a background photo: upload one or give an image URL',
    'REQUIRED',
  );

  const linkHref = v.requiredString('linkHref', { min: 1, max: LINK_HREF_MAX });
  if (linkHref) validateLinkHref(v, 'linkHref', linkHref);

  const dto: CreatePosOutcomeStoryInput = {
    name: v.requiredString('name', { min: 2, max: NAME_MAX }),
    slug,
    logoUrl,
    logoFileId,
    photoUrl,
    photoFileId,
    quote: v.requiredString('quote', { min: 10, max: QUOTE_MAX }),
    personName: v.requiredString('personName', { min: 2, max: PERSON_MAX }),
    personCompany: v.requiredString('personCompany', { min: 1, max: PERSON_MAX }),
    linkLabel: v.requiredString('linkLabel', { min: 2, max: LINK_LABEL_MAX }),
    linkHref,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdatePosOutcomeStory(body: unknown): UpdatePosOutcomeStoryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'name',
    'slug',
    'logoUrl',
    'logoFileId',
    'photoUrl',
    'photoFileId',
    'quote',
    'personName',
    'personCompany',
    'linkLabel',
    'linkHref',
    'displayOrder',
    'status',
  ]);

  const slug = v.has('slug') ? v.requiredString('slug', { min: 2, max: SLUG_MAX }) : undefined;
  if (slug) checkSlug(v, slug);

  // `null` clears the field; `undefined` (absent) leaves it alone.
  const logoUrl = v.has('logoUrl')
    ? (v.optionalString('logoUrl', { max: MEDIA_URL_MAX }) ?? null)
    : undefined;
  if (logoUrl) validateMediaUrl(v, 'logoUrl', logoUrl);
  const logoFileId = v.has('logoFileId') ? (v.optionalUuid('logoFileId') ?? null) : undefined;

  v.custom(
    !(logoUrl && logoFileId),
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  /*
   * Clearing both at once would leave the card with no mark, which the CHECK
   * constraint rejects. Clearing one while the other is already stored is fine
   * and is resolved in the repository, which can see the current row.
   */
  v.custom(
    !(logoUrl === null && logoFileId === null),
    'logoFileId',
    'A story needs a brand mark: upload one or give an image URL',
    'REQUIRED',
  );

  const photoUrl = v.has('photoUrl')
    ? (v.optionalString('photoUrl', { max: MEDIA_URL_MAX }) ?? null)
    : undefined;
  if (photoUrl) validateMediaUrl(v, 'photoUrl', photoUrl);
  const photoFileId = v.has('photoFileId') ? (v.optionalUuid('photoFileId') ?? null) : undefined;

  v.custom(
    !(photoUrl && photoFileId),
    'photoUrl',
    'Provide either photoUrl or photoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );
  v.custom(
    !(photoUrl === null && photoFileId === null),
    'photoFileId',
    'A story needs a background photo: upload one or give an image URL',
    'REQUIRED',
  );

  const linkHref = v.has('linkHref')
    ? v.requiredString('linkHref', { min: 1, max: LINK_HREF_MAX })
    : undefined;
  if (linkHref) validateLinkHref(v, 'linkHref', linkHref);

  const dto: UpdatePosOutcomeStoryInput = {
    name: v.optionalString('name', { min: 2, max: NAME_MAX }),
    slug,
    logoUrl,
    logoFileId,
    photoUrl,
    photoFileId,
    quote: v.optionalString('quote', { min: 10, max: QUOTE_MAX }),
    personName: v.optionalString('personName', { min: 2, max: PERSON_MAX }),
    personCompany: v.optionalString('personCompany', { min: 1, max: PERSON_MAX }),
    linkLabel: v.optionalString('linkLabel', { min: 2, max: LINK_LABEL_MAX }),
    linkHref,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// -- the figures ------------------------------------------------------------

export function validatePosOutcomeStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 *
 * The cap is the larger of the two lists, because one validator serves both;
 * each service checks the count it actually holds.
 */
export function validatePosOutcomeReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', {
    max: Math.max(LIMITS.MAX_POS_OUTCOME_STORIES, LIMITS.MAX_FMS_OUTCOME_STATS),
  });

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

export function validatePosOutcomeStoryListQuery(query: Record<string, unknown>): {
  filters: PosOutcomeStoryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: PosOutcomeStoryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
