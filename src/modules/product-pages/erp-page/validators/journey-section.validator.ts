// src/modules/product-pages/erp-page/validators/journey-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import { ERP_ICON_NAMES, ErpIconName, isErpIconName } from '../utils/icons';
import {
  CreateErpJourneyOutcomeInput,
  CreateErpJourneyPersonaInput,
  CreateErpJourneyPointInput,
  CreateErpJourneyStatInput,
  ErpJourneyPersonaFilters,
  UpdateErpJourneyOutcomeInput,
  UpdateErpJourneyPersonaInput,
  UpdateErpJourneyPointInput,
  UpdateErpJourneyStatInput,
} from '../types/journey-section.types';
import { ReorderInput } from '../types/recognition-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const ROLE_MAX = 120;
const CONTEXT_MAX = 200;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 600;
const METRIC_TEXT_MAX = 40;
const AFFIX_MAX = 16;
const METRIC_LABEL_MAX = 255;
const AUTHOR_MAX = 160;
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const LINE_MAX = 400;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 160;
const STAT_DESCRIPTION_MAX = 600;

/** A CSS hex colour. The site sets it as an inline background, nothing more. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Reads an icon name and checks it against the allowlist.
 *
 * An unknown name would render nothing at all on the live page - the site maps
 * names to components through a fixed lookup - so this is the one place that
 * can catch it before it reaches a visitor.
 */
function readIcon(v: Validator, field: string, required: boolean): ErpIconName | undefined {
  if (!required && !v.has(field)) return undefined;

  const raw = required
    ? v.requiredString(field, { min: 1, max: 60 })
    : (v.optionalString(field, { max: 60 }) ?? '');
  if (!raw) return undefined;

  v.custom(
    isErpIconName(raw),
    field,
    `${field} must be one of the available icons: ${ERP_ICON_NAMES.join(', ')}`,
    'UNKNOWN_ICON',
  );

  return isErpIconName(raw) ? raw : undefined;
}

function checkAvatarColor(v: Validator, color: string): void {
  v.custom(
    HEX_COLOR.test(color),
    'avatarColor',
    'avatarColor must be a hex colour like #1565C0',
    'INVALID_COLOR',
  );
}

// ── personas ──────────────────────────────────────────────────────────────

export function validateCreateErpJourneyPersona(body: unknown): CreateErpJourneyPersonaInput {
  const v = validator(body);

  /*
   * The headline figure comes in one of two forms, and exactly one of them.
   * A number animates up from zero; a string like "8-18%" is printed as
   * written because it cannot count. Both set would leave the site choosing;
   * neither set renders an empty panel. Mirrors the metric CHECK constraint.
   */
  const metricCountTo =
    v.optionalNumber('metricCountTo', { min: 0, max: 1_000_000, integer: true }) ?? null;
  const metricText = v.optionalString('metricText', { max: METRIC_TEXT_MAX }) ?? null;

  v.custom(
    (metricCountTo === null) !== (metricText === null),
    'metricCountTo',
    'Give the metric either as a number to count up to or as text, not both and not neither',
    'CONFLICTING_METRIC',
  );

  const avatarUrl = v.optionalString('avatarUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (avatarUrl) validateMediaUrl(v, 'avatarUrl', avatarUrl);
  const avatarFileId = v.optionalUuid('avatarFileId') ?? null;

  // Mirrors erp_journey_personas_avatar_source_check. Neither is allowed: the
  // panel falls back to initials on a coloured disc.
  v.custom(
    avatarUrl === null || avatarFileId === null,
    'avatarUrl',
    'Provide either avatarUrl or avatarFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const avatarColor = v.optionalString('avatarColor', { max: 32 }) ?? '#1565C0';
  checkAvatarColor(v, avatarColor);

  const dto: CreateErpJourneyPersonaInput = {
    role: v.requiredString('role', { min: 2, max: ROLE_MAX }),
    context: v.requiredString('context', { min: 2, max: CONTEXT_MAX }),
    title: v.requiredString('title', { min: 3, max: TITLE_MAX }),
    description: v.requiredString('description', { min: 3, max: DESCRIPTION_MAX }),
    metricCountTo,
    metricText,
    metricPrefix: v.optionalString('metricPrefix', { max: AFFIX_MAX }) ?? null,
    metricSuffix: v.optionalString('metricSuffix', { max: AFFIX_MAX }) ?? null,
    metricLabel: v.requiredString('metricLabel', { min: 3, max: METRIC_LABEL_MAX }),
    authorDesignation: v.requiredString('authorDesignation', { min: 2, max: AUTHOR_MAX }),
    authorCompany: v.requiredString('authorCompany', { min: 2, max: AUTHOR_MAX }),
    avatarUrl,
    avatarFileId,
    avatarAlt: v.optionalString('avatarAlt', { max: ALT_MAX }) ?? null,
    avatarColor,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpJourneyPersona(body: unknown): UpdateErpJourneyPersonaInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'role',
    'context',
    'title',
    'description',
    'metricCountTo',
    'metricText',
    'metricPrefix',
    'metricSuffix',
    'metricLabel',
    'authorDesignation',
    'authorCompany',
    'avatarUrl',
    'avatarFileId',
    'avatarAlt',
    'avatarColor',
    'displayOrder',
    'status',
  ]);

  // `null` clears the field; `undefined` (absent) leaves it alone.
  const metricCountTo = v.has('metricCountTo')
    ? (v.optionalNumber('metricCountTo', { min: 0, max: 1_000_000, integer: true }) ?? null)
    : undefined;
  const metricText = v.has('metricText')
    ? (v.optionalString('metricText', { max: METRIC_TEXT_MAX }) ?? null)
    : undefined;

  /*
   * Only checked when both halves are named. Setting one while the other is
   * already stored is resolved in the repository, which can see the current
   * row and clears the twin - the same way the two media columns work.
   */
  if (metricCountTo !== undefined && metricText !== undefined) {
    v.custom(
      (metricCountTo === null) !== (metricText === null),
      'metricCountTo',
      'Give the metric either as a number to count up to or as text, not both and not neither',
      'CONFLICTING_METRIC',
    );
  }

  const avatarUrl = v.has('avatarUrl')
    ? (v.optionalString('avatarUrl', { max: IMAGE_URL_MAX }) ?? null)
    : undefined;
  if (avatarUrl) validateMediaUrl(v, 'avatarUrl', avatarUrl);
  const avatarFileId = v.has('avatarFileId')
    ? (v.optionalUuid('avatarFileId') ?? null)
    : undefined;

  v.custom(
    !(avatarUrl && avatarFileId),
    'avatarUrl',
    'Provide either avatarUrl or avatarFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const avatarColor = v.has('avatarColor')
    ? v.requiredString('avatarColor', { min: 4, max: 32 })
    : undefined;
  if (avatarColor) checkAvatarColor(v, avatarColor);

  const dto: UpdateErpJourneyPersonaInput = {
    role: v.has('role') ? v.requiredString('role', { min: 2, max: ROLE_MAX }) : undefined,
    context: v.has('context')
      ? v.requiredString('context', { min: 2, max: CONTEXT_MAX })
      : undefined,
    title: v.has('title') ? v.requiredString('title', { min: 3, max: TITLE_MAX }) : undefined,
    description: v.has('description')
      ? v.requiredString('description', { min: 3, max: DESCRIPTION_MAX })
      : undefined,
    metricCountTo,
    metricText,
    metricPrefix: v.has('metricPrefix')
      ? (v.optionalString('metricPrefix', { max: AFFIX_MAX }) ?? null)
      : undefined,
    metricSuffix: v.has('metricSuffix')
      ? (v.optionalString('metricSuffix', { max: AFFIX_MAX }) ?? null)
      : undefined,
    metricLabel: v.has('metricLabel')
      ? v.requiredString('metricLabel', { min: 3, max: METRIC_LABEL_MAX })
      : undefined,
    authorDesignation: v.has('authorDesignation')
      ? v.requiredString('authorDesignation', { min: 2, max: AUTHOR_MAX })
      : undefined,
    authorCompany: v.has('authorCompany')
      ? v.requiredString('authorCompany', { min: 2, max: AUTHOR_MAX })
      : undefined,
    avatarUrl,
    avatarFileId,
    avatarAlt: v.has('avatarAlt')
      ? (v.optionalString('avatarAlt', { max: ALT_MAX }) ?? null)
      : undefined,
    avatarColor,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── measurable outcomes ───────────────────────────────────────────────────

export function validateCreateErpJourneyOutcome(body: unknown): CreateErpJourneyOutcomeInput {
  const v = validator(body);

  const dto: CreateErpJourneyOutcomeInput = {
    text: v.requiredString('text', { min: 3, max: LINE_MAX }),
    // Defaulted rather than required: the page ticks every line today, so an
    // editor adding one should not have to pick the tick each time.
    icon: readIcon(v, 'icon', false) ?? 'CheckCircle2',
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpJourneyOutcome(body: unknown): UpdateErpJourneyOutcomeInput {
  const v = validator(body);

  v.requireAtLeastOne(['text', 'icon', 'displayOrder', 'status']);

  const dto: UpdateErpJourneyOutcomeInput = {
    text: v.has('text') ? v.requiredString('text', { min: 3, max: LINE_MAX }) : undefined,
    icon: readIcon(v, 'icon', false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── beyond the numbers ────────────────────────────────────────────────────

export function validateCreateErpJourneyPoint(body: unknown): CreateErpJourneyPointInput {
  const v = validator(body);

  const dto: CreateErpJourneyPointInput = {
    text: v.requiredString('text', { min: 3, max: LINE_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpJourneyPoint(body: unknown): UpdateErpJourneyPointInput {
  const v = validator(body);

  v.requireAtLeastOne(['text', 'displayOrder', 'status']);

  const dto: UpdateErpJourneyPointInput = {
    text: v.has('text') ? v.requiredString('text', { min: 3, max: LINE_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── company-wide statistics ───────────────────────────────────────────────

export function validateCreateErpJourneyStat(body: unknown): CreateErpJourneyStatInput {
  const v = validator(body);

  const dto: CreateErpJourneyStatInput = {
    // Typed exactly as it should read - the separator and the plus are the
    // author's, because the site prints this rather than formatting a number.
    value: v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }),
    prefix: v.optionalString('prefix', { max: AFFIX_MAX }) ?? null,
    suffix: v.optionalString('suffix', { max: AFFIX_MAX }) ?? null,
    label: v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }),
    description: v.optionalString('description', { max: STAT_DESCRIPTION_MAX }) ?? null,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateErpJourneyStat(body: unknown): UpdateErpJourneyStatInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'value',
    'prefix',
    'suffix',
    'label',
    'description',
    'displayOrder',
    'status',
  ]);

  const dto: UpdateErpJourneyStatInput = {
    value: v.has('value') ? v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }) : undefined,
    prefix: v.has('prefix')
      ? (v.optionalString('prefix', { max: AFFIX_MAX }) ?? null)
      : undefined,
    suffix: v.has('suffix')
      ? (v.optionalString('suffix', { max: AFFIX_MAX }) ?? null)
      : undefined,
    label: v.has('label') ? v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }) : undefined,
    description: v.has('description')
      ? (v.optionalString('description', { max: STAT_DESCRIPTION_MAX }) ?? null)
      : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── shared ────────────────────────────────────────────────────────────────

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 *
 * The cap is the largest of the four lists, because one validator serves all
 * of them; each service checks the count it actually holds.
 */
export function validateErpJourneyReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', {
    max: Math.max(
      LIMITS.MAX_ERP_JOURNEY_PERSONAS,
      LIMITS.MAX_ERP_JOURNEY_OUTCOMES,
      LIMITS.MAX_ERP_JOURNEY_POINTS,
      LIMITS.MAX_ERP_JOURNEY_STATS,
    ),
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

export function validateErpJourneyPersonaListQuery(query: Record<string, unknown>): {
  filters: ErpJourneyPersonaFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ErpJourneyPersonaFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
