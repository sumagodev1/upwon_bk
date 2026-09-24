// src/modules/product-pages/sfa-dms-page/validators/compliance-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import { SFA_ICON_NAMES, SfaIconName, isSfaIconName } from '../utils/icons';
import {
  CreateSfaComplianceBadgeInput,
  SfaComplianceBadgeFilters,
  UpdateSfaComplianceBadgeInput,
  UpsertSfaComplianceSectionInput,
} from '../types/compliance-section.types';
import { ReorderInput } from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const LABEL_MAX = 120;
const IMAGE_URL_MAX = 1000;
const TITLE_MAX = 160;
const SUBTEXT_MAX = 255;

/** Mirrors sfa_compliance_section_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Reads an icon name from a named field and checks it against the allowlist.
 *
 * An unknown name would render a question mark on the live page - the site
 * maps names to components through a fixed lookup - so this is the one place
 * that can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, field: string, required: boolean): SfaIconName | undefined {
  if (!required && !v.has(field)) return undefined;

  const raw = required
    ? v.requiredString(field, { min: 1, max: 60 })
    : (v.optionalString(field, { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isSfaIconName(raw),
    field,
    `${field} must be one of the available icons: ${SFA_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isSfaIconName(raw) ? raw : undefined;
}

// ── the two panel headers ─────────────────────────────────────────────────

export function validateUpsertSfaComplianceSection(
  body: unknown,
): UpsertSfaComplianceSectionInput {
  const v = validator(body);

  const backgroundImageUrl =
    v.optionalString('backgroundImageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (backgroundImageUrl) validateMediaUrl(v, 'backgroundImageUrl', backgroundImageUrl);
  const backgroundImageFileId = v.optionalUuid('backgroundImageFileId') ?? null;

  /*
   * Mirrors sfa_compliance_section_single_background_source_check. Neither is
   * allowed: without artwork the panel keeps its cream ground, which is a
   * working design.
   */
  v.custom(
    backgroundImageUrl === null || backgroundImageFileId === null,
    'backgroundImageUrl',
    'Provide either backgroundImageUrl or backgroundImageFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const ecosystemColor = v.requiredString('ecosystemColor', { min: 7, max: 7 });
  v.custom(
    HEX_COLOR.test(ecosystemColor),
    'ecosystemColor',
    'ecosystemColor must be a six-digit hex colour, like #1D6FE0',
    'INVALID_COLOR',
  );

  const dto: UpsertSfaComplianceSectionInput = {
    complianceLabel: v.requiredString('complianceLabel', { min: 2, max: LABEL_MAX }),
    complianceIcon: readIcon(v, 'complianceIcon', true) as SfaIconName,
    backgroundImageUrl,
    backgroundImageFileId,
    ecosystemLabel: v.requiredString('ecosystemLabel', { min: 2, max: LABEL_MAX }),
    ecosystemIcon: readIcon(v, 'ecosystemIcon', true) as SfaIconName,
    ecosystemColor,
  };

  v.assert();
  return dto;
}

// ── the badges ────────────────────────────────────────────────────────────

export function validateCreateSfaComplianceBadge(
  body: unknown,
): CreateSfaComplianceBadgeInput {
  const v = validator(body);

  const dto: CreateSfaComplianceBadgeInput = {
    icon: readIcon(v, 'icon', true) as SfaIconName,
    title: v.requiredString('title', { min: 2, max: TITLE_MAX }),
    subtext: v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateSfaComplianceBadge(
  body: unknown,
): UpdateSfaComplianceBadgeInput {
  const v = validator(body);

  v.requireAtLeastOne(['icon', 'title', 'subtext', 'displayOrder', 'status']);

  const dto: UpdateSfaComplianceBadgeInput = {
    icon: readIcon(v, 'icon', false),
    title: v.has('title') ? v.requiredString('title', { min: 2, max: TITLE_MAX }) : undefined,
    subtext: v.has('subtext')
      ? v.requiredString('subtext', { min: 3, max: SUBTEXT_MAX })
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateSfaComplianceBadgeListQuery(query: Record<string, unknown>): {
  filters: SfaComplianceBadgeFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: SfaComplianceBadgeFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateSfaComplianceStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateSfaComplianceBadgeReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_SFA_COMPLIANCE_BADGES });

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
