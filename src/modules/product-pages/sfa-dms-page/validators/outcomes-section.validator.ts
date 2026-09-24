// src/modules/product-pages/sfa-dms-page/validators/outcomes-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import {
  CreateSfaOutcomeCardInput,
  SfaOutcomeCardFilters,
  UpdateSfaOutcomeCardInput,
  UpsertSfaOutcomeSectionInput,
} from '../types/outcomes-section.types';
import { ReorderInput } from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const BUTTON_LABEL_MAX = 120;
const HREF_MAX = 500;
const TITLE_MAX = 255;
const BODY_MAX = 1200;
const NAME_MAX = 160;
const ROLE_MAX = 160;
const COMPANY_MAX = 160;
const PHOTO_URL_MAX = 1000;

// ── the two buttons ───────────────────────────────────────────────────────

export function validateUpsertSfaOutcomeSection(body: unknown): UpsertSfaOutcomeSectionInput {
  const v = validator(body);

  const primaryHref = v.requiredString('primaryHref', { min: 1, max: HREF_MAX });
  if (primaryHref) validateLinkHref(v, 'primaryHref', primaryHref);

  const secondaryHref = v.requiredString('secondaryHref', { min: 1, max: HREF_MAX });
  if (secondaryHref) validateLinkHref(v, 'secondaryHref', secondaryHref);

  /*
   * Both buttons are required, unlike the optional buttons elsewhere. They sit
   * beside the heading as the section's only call to action, and one of them
   * missing leaves a lone button off-centre rather than a quieter design.
   */
  const dto: UpsertSfaOutcomeSectionInput = {
    primaryLabel: v.requiredString('primaryLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    primaryHref,
    secondaryLabel: v.requiredString('secondaryLabel', { min: 2, max: BUTTON_LABEL_MAX }),
    secondaryHref,
  };

  v.assert();
  return dto;
}

// ── the story cards ───────────────────────────────────────────────────────

/**
 * Reads the portrait pair.
 *
 * On create exactly one source is required - the card is half portrait tile,
 * and one without an image is a coloured square beside the words. On update
 * either may be absent, meaning "leave it alone", but the two still cannot
 * arrive together, and the repository clears the other side when one is set.
 */
function readPhotoPair(
  v: Validator,
  required: boolean,
): { photoUrl: string | null | undefined; photoFileId: string | null | undefined } {
  const photoUrl = v.optionalString('photoUrl', { max: PHOTO_URL_MAX }) ?? null;
  if (photoUrl) validateMediaUrl(v, 'photoUrl', photoUrl);
  const photoFileId = v.optionalUuid('photoFileId') ?? null;

  // Mirrors sfa_outcome_cards_single_photo_source_check.
  v.custom(
    photoUrl === null || photoFileId === null,
    'photoUrl',
    'Provide either photoUrl or photoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  if (required) {
    v.custom(
      photoUrl !== null || photoFileId !== null,
      'photoUrl',
      'A story needs a portrait: give either photoUrl or photoFileId',
      'REQUIRED',
    );
    return { photoUrl, photoFileId };
  }

  /*
   * On update, an absent key means "unchanged" rather than "clear": clearing
   * both would leave a row the table's photo-required check rejects anyway.
   */
  return {
    photoUrl: v.has('photoUrl') ? photoUrl : undefined,
    photoFileId: v.has('photoFileId') ? photoFileId : undefined,
  };
}

/** The corner arrow's destination. Absent means no arrow, which is allowed. */
function readLinkHref(v: Validator): string | null {
  const linkHref = v.optionalString('linkHref', { max: HREF_MAX }) ?? null;
  if (linkHref) validateLinkHref(v, 'linkHref', linkHref);
  return linkHref;
}

export function validateCreateSfaOutcomeCard(body: unknown): CreateSfaOutcomeCardInput {
  const v = validator(body);
  const { photoUrl, photoFileId } = readPhotoPair(v, true);

  const dto: CreateSfaOutcomeCardInput = {
    title: v.requiredString('title', { min: 5, max: TITLE_MAX }),
    body: v.requiredString('body', { min: 20, max: BODY_MAX }),
    personName: v.requiredString('personName', { min: 2, max: NAME_MAX }),
    personRole: v.requiredString('personRole', { min: 2, max: ROLE_MAX }),
    company: v.requiredString('company', { min: 2, max: COMPANY_MAX }),
    photoUrl: photoUrl ?? null,
    photoFileId: photoFileId ?? null,
    linkHref: readLinkHref(v),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateSfaOutcomeCard(body: unknown): UpdateSfaOutcomeCardInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'title',
    'body',
    'personName',
    'personRole',
    'company',
    'photoUrl',
    'photoFileId',
    'linkHref',
    'displayOrder',
    'status',
  ]);

  const { photoUrl, photoFileId } = readPhotoPair(v, false);

  const dto: UpdateSfaOutcomeCardInput = {
    title: v.has('title') ? v.requiredString('title', { min: 5, max: TITLE_MAX }) : undefined,
    body: v.has('body') ? v.requiredString('body', { min: 20, max: BODY_MAX }) : undefined,
    personName: v.has('personName')
      ? v.requiredString('personName', { min: 2, max: NAME_MAX })
      : undefined,
    personRole: v.has('personRole')
      ? v.requiredString('personRole', { min: 2, max: ROLE_MAX })
      : undefined,
    company: v.has('company')
      ? v.requiredString('company', { min: 2, max: COMPANY_MAX })
      : undefined,
    photoUrl,
    photoFileId,
    // Null clears the arrow, which is a valid state, so absence is what leaves
    // it alone - hence the explicit presence check.
    linkHref: v.has('linkHref') ? readLinkHref(v) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSfaOutcomeCardListQuery(query: Record<string, unknown>): {
  filters: SfaOutcomeCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SfaOutcomeCardFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateSfaOutcomeStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateSfaOutcomeCardReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_SFA_OUTCOME_CARDS });

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
