// src/modules/product-pages/pos-page/validators/security-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { hasBalancedAccentMarkers } from '../../../home-page/utils/heading-markup';
import { validateMediaUrl } from '../utils/link';
import { POS_ICON_NAMES, PosIconName, isPosIconName } from '../utils/icons';
import {
  CreatePosSecurityAssuranceInput,
  CreatePosSecurityBadgeInput,
  CreatePosSecurityLogoInput,
  PosSecurityListFilters,
  ReorderInput,
  UpdatePosSecurityAssuranceInput,
  UpdatePosSecurityBadgeInput,
  UpdatePosSecurityLogoInput,
  UpsertPosSecuritySectionInput,
} from '../types/security-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const PANEL_LABEL_MAX = 120;
const SPHERE_FOOTNOTE_MAX = 240;
const DATA_HEADING_MAX = 160;
const DATA_BODY_MAX = 600;
const BADGE_TITLE_MAX = 160;
const BADGE_SUBTEXT_MAX = 255;
const ALT_MAX = 255;
const ASSURANCE_LABEL_MAX = 120;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render a question mark on the live page - the site
 * maps names to components through a fixed lookup - so this is the one place
 * that can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, field: string, required: boolean): PosIconName | undefined {
  if (!required && !v.has(field)) return undefined;

  const raw = required
    ? v.requiredString(field, { min: 1, max: 60 })
    : (v.optionalString(field, { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isPosIconName(raw),
    field,
    `${field} must be one of the available icons: ${POS_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isPosIconName(raw) ? raw : undefined;
}

/**
 * Reads one optional, mutually exclusive image pair.
 *
 * Neither source is required here: every image in this band is decoration the
 * layout is designed to close up around, so "no picture" is a working state
 * rather than an incomplete one.
 */
function readOptionalImagePair(
  v: Validator,
  urlField: string,
  fileField: string,
): { url: string | null; fileId: string | null } {
  const url = v.optionalString(urlField, { max: IMAGE_URL_MAX }) ?? null;
  if (url) validateMediaUrl(v, urlField, url);
  const fileId = v.optionalUuid(fileField) ?? null;

  v.custom(
    url === null || fileId === null,
    urlField,
    `Provide either ${urlField} or ${fileField}, not both`,
    'CONFLICTING_IMAGE_SOURCE',
  );

  return { url, fileId };
}

// ── the fixed furniture ───────────────────────────────────────────────────

export function validateUpsertPosSecuritySection(
  body: unknown,
): UpsertPosSecuritySectionInput {
  const v = validator(body);

  const shield = readOptionalImagePair(v, 'shieldImageUrl', 'shieldImageFileId');
  const left = readOptionalImagePair(v, 'dataLeftImageUrl', 'dataLeftImageFileId');
  const right = readOptionalImagePair(v, 'dataRightImageUrl', 'dataRightImageFileId');

  /*
   * The caption under the sphere is drawn with an orange half, so it takes
   * the same accent grammar the headings do - and the same check, because an
   * unclosed marker would render the literal asterisks to a visitor.
   *
   * A whitespace-only value collapses to null rather than failing. optionalString
   * treats a blank as a missing REQUIRED value and answers "sphereFootnote is
   * required", which on a caption the sphere reads fine without is both wrong
   * and confusing - and is exactly what an editor gets for clearing the box.
   */
  const footnoteRaw = (body as Record<string, unknown> | null)?.sphereFootnote;
  const sphereFootnote =
    typeof footnoteRaw === 'string' && footnoteRaw.trim() === ''
      ? null
      : (v.optionalString('sphereFootnote', { max: SPHERE_FOOTNOTE_MAX }) ?? null);

  if (sphereFootnote) {
    v.custom(
      hasBalancedAccentMarkers(sphereFootnote),
      'sphereFootnote',
      'sphereFootnote has an unclosed ** accent marker; wrap accented words as **like this**',
      'UNBALANCED_ACCENT_MARKER',
    );
  }

  const dto: UpsertPosSecuritySectionInput = {
    // The panel labels head their halves of the band; an unlabelled column
    // reads as an unfinished page rather than a quieter one.
    panelOneLabel: v.requiredString('panelOneLabel', { min: 2, max: PANEL_LABEL_MAX }),
    panelTwoLabel: v.requiredString('panelTwoLabel', { min: 2, max: PANEL_LABEL_MAX }),
    shieldImageUrl: shield.url,
    shieldImageFileId: shield.fileId,
    sphereFootnote,
    /*
     * The data strip is required. It is the section's actual promise about
     * customer data - a band that raises the subject and then says nothing
     * would be worse than one that never raised it.
     */
    dataIcon: readIcon(v, 'dataIcon', true) as PosIconName,
    dataHeading: v.requiredString('dataHeading', { min: 2, max: DATA_HEADING_MAX }),
    dataBody: v.requiredString('dataBody', { min: 2, max: DATA_BODY_MAX }),
    dataLeftImageUrl: left.url,
    dataLeftImageFileId: left.fileId,
    dataRightImageUrl: right.url,
    dataRightImageFileId: right.fileId,
  };

  v.assert();
  return dto;
}

// ── the compliance badges ─────────────────────────────────────────────────

export function validateCreatePosSecurityBadge(body: unknown): CreatePosSecurityBadgeInput {
  const v = validator(body);

  const dto: CreatePosSecurityBadgeInput = {
    icon: readIcon(v, 'icon', true) as PosIconName,
    title: v.requiredString('title', { min: 2, max: BADGE_TITLE_MAX }),
    /*
     * Required: a badge is a claim, and the line under it is what the claim
     * actually says. "ISO-aligned" on its own is a word, not evidence.
     */
    subtext: v.requiredString('subtext', { min: 2, max: BADGE_SUBTEXT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdatePosSecurityBadge(body: unknown): UpdatePosSecurityBadgeInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'title', 'subtext', 'displayOrder', 'status']);

  const dto: UpdatePosSecurityBadgeInput = {
    icon: readIcon(v, 'icon', false),
    title: v.has('title') ? v.requiredString('title', { min: 2, max: BADGE_TITLE_MAX }) : undefined,
    subtext: v.has('subtext')
      ? v.requiredString('subtext', { min: 2, max: BADGE_SUBTEXT_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── the sphere's marks ────────────────────────────────────────────────────

/**
 * Reads the mark's image pair.
 *
 * On create exactly one source is required - a logo row exists only to show a
 * mark, so one with neither is an empty node on the sphere. On update either
 * may be absent, meaning "leave it alone", but the two still cannot arrive
 * together, and the repository clears the other side when one is set.
 */
function readLogoImagePair(
  v: Validator,
  required: boolean,
): { imageUrl: string | null | undefined; imageFileId: string | null | undefined } {
  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  v.custom(
    imageUrl === null || imageFileId === null,
    'imageUrl',
    'Provide either imageUrl or imageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  if (required) {
    v.custom(
      imageUrl !== null || imageFileId !== null,
      'imageUrl',
      'A logo needs an image: give either imageUrl or imageFileId',
      'REQUIRED',
    );
    return { imageUrl, imageFileId };
  }

  return {
    imageUrl: v.has('imageUrl') ? imageUrl : undefined,
    imageFileId: v.has('imageFileId') ? imageFileId : undefined,
  };
}

export function validateCreatePosSecurityLogo(body: unknown): CreatePosSecurityLogoInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readLogoImagePair(v, true);

  const dto: CreatePosSecurityLogoInput = {
    imageUrl: imageUrl ?? null,
    imageFileId: imageFileId ?? null,
    alt: v.requiredString('alt', { min: 1, max: ALT_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdatePosSecurityLogo(body: unknown): UpdatePosSecurityLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readLogoImagePair(v, false);

  const dto: UpdatePosSecurityLogoInput = {
    imageUrl,
    imageFileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── the assurances ────────────────────────────────────────────────────────

export function validateCreatePosSecurityAssurance(
  body: unknown,
): CreatePosSecurityAssuranceInput {
  const v = validator(body);

  const dto: CreatePosSecurityAssuranceInput = {
    icon: readIcon(v, 'icon', true) as PosIconName,
    label: v.requiredString('label', { min: 2, max: ASSURANCE_LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdatePosSecurityAssurance(
  body: unknown,
): UpdatePosSecurityAssuranceInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'label', 'displayOrder', 'status']);

  const dto: UpdatePosSecurityAssuranceInput = {
    icon: readIcon(v, 'icon', false),
    label: v.has('label')
      ? v.requiredString('label', { min: 2, max: ASSURANCE_LABEL_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── shared ────────────────────────────────────────────────────────────────

export function validatePosSecurityListQuery(query: Record<string, unknown>): {
  filters: PosSecurityListFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: PosSecurityListFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validatePosSecurityStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
function validateReorder(body: unknown, max: number): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max });

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

export const validatePosSecurityBadgeReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_POS_SECURITY_BADGES);

export const validatePosSecurityLogoReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_POS_SECURITY_LOGOS);

export const validatePosSecurityAssuranceReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_POS_SECURITY_ASSURANCES);
