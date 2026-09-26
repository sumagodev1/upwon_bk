// src/modules/product-pages/hreasy-page/validators/outcomes-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import {
  CreateHreasyOutcomeStatInput,
  CreateHreasyOutcomeStoryInput,
  HreasyOutcomeStoryFilters,
  ReorderInput,
  UpdateHreasyOutcomeStatInput,
  UpdateHreasyOutcomeStoryInput,
} from '../types/outcomes-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const NAME_MAX = 160;
const SLUG_MAX = 80;
const TAG_MAX = 60;
const HERO_VALUE_MAX = 40;
const HERO_LABEL_MAX = 160;
const BODY_MAX = 800;
const LINK_LABEL_MAX = 120;
const LINK_HREF_MAX = 500;
const LOGO_URL_MAX = 1000;
const STAT_VALUE_MAX = 40;
const STAT_LABEL_MAX = 160;

/**
 * A slug is lowercase words joined by single hyphens.
 *
 * Mirrors hreasy_outcome_stories_slug_format_check. Checked rather than
 * generated from the name: it is what a deep link points at, so it has to
 * survive a rename, which means an author owns it.
 */
function checkSlug(v: Validator, slug: string): void {
  v.custom(
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug),
    'slug',
    'slug must be lowercase letters, digits and single hyphens - like luft-food',
    'INVALID_SLUG',
  );
}

export function validateCreateHreasyOutcomeStory(
  body: unknown,
): CreateHreasyOutcomeStoryInput {
  const v = validator(body);

  const slug = v.requiredString('slug', { min: 2, max: SLUG_MAX });
  if (slug) checkSlug(v, slug);

  const linkHref = v.requiredString('linkHref', { min: 1, max: LINK_HREF_MAX });
  if (linkHref) validateLinkHref(v, 'linkHref', linkHref);

  /*
   * The mark is optional, unlike the other pages' outcome cards: a story
   * without one draws its name as words, which is what the flagship card
   * does today. Still at most one source, as the CHECK requires.
   */
  const logoUrl = v.optionalString('logoUrl', { max: LOGO_URL_MAX }) ?? null;
  if (logoUrl) validateMediaUrl(v, 'logoUrl', logoUrl);
  const logoFileId = v.optionalUuid('logoFileId') ?? null;

  v.custom(
    logoUrl === null || logoFileId === null,
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: CreateHreasyOutcomeStoryInput = {
    name: v.requiredString('name', { min: 2, max: NAME_MAX }),
    slug,
    logoUrl,
    logoFileId,
    tag: v.requiredString('tag', { min: 2, max: TAG_MAX }),
    heroValue: v.requiredString('heroValue', { min: 1, max: HERO_VALUE_MAX }),
    heroLabel: v.requiredString('heroLabel', { min: 2, max: HERO_LABEL_MAX }),
    body: v.requiredString('body', { min: 10, max: BODY_MAX }),
    linkLabel: v.requiredString('linkLabel', { min: 1, max: LINK_LABEL_MAX }),
    linkHref,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateHreasyOutcomeStory(
  body: unknown,
): UpdateHreasyOutcomeStoryInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'name',
    'slug',
    'logoUrl',
    'logoFileId',
    'tag',
    'heroValue',
    'heroLabel',
    'body',
    'linkLabel',
    'linkHref',
    'displayOrder',
    'status',
  ]);

  const slug = v.has('slug') ? v.requiredString('slug', { min: 2, max: SLUG_MAX }) : undefined;
  if (slug) checkSlug(v, slug);

  const linkHref = v.has('linkHref')
    ? v.requiredString('linkHref', { min: 1, max: LINK_HREF_MAX })
    : undefined;
  if (linkHref) validateLinkHref(v, 'linkHref', linkHref);

  // `null` clears the mark - a legitimate state, since the card then draws
  // the name as words. Absent leaves it alone.
  const logoUrl = v.has('logoUrl')
    ? (v.optionalString('logoUrl', { max: LOGO_URL_MAX }) ?? null)
    : undefined;
  if (logoUrl) validateMediaUrl(v, 'logoUrl', logoUrl);

  const logoFileId = v.has('logoFileId') ? (v.optionalUuid('logoFileId') ?? null) : undefined;

  v.custom(
    !(logoUrl && logoFileId),
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateHreasyOutcomeStoryInput = {
    name: v.optionalString('name', { min: 2, max: NAME_MAX }),
    slug,
    logoUrl,
    logoFileId,
    tag: v.optionalString('tag', { min: 2, max: TAG_MAX }),
    heroValue: v.optionalString('heroValue', { min: 1, max: HERO_VALUE_MAX }),
    heroLabel: v.optionalString('heroLabel', { min: 2, max: HERO_LABEL_MAX }),
    body: v.optionalString('body', { min: 10, max: BODY_MAX }),
    linkLabel: v.optionalString('linkLabel', { min: 1, max: LINK_LABEL_MAX }),
    linkHref,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── the figures ───────────────────────────────────────────────────────────

export function validateCreateHreasyOutcomeStat(body: unknown): CreateHreasyOutcomeStatInput {
  const v = validator(body);

  const dto: CreateHreasyOutcomeStatInput = {
    value: v.requiredString('value', { min: 1, max: STAT_VALUE_MAX }),
    label: v.requiredString('label', { min: 2, max: STAT_LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateHreasyOutcomeStat(body: unknown): UpdateHreasyOutcomeStatInput {
  const v = validator(body);

  v.requireAtLeastOne(['value', 'label', 'displayOrder', 'status']);

  const dto: UpdateHreasyOutcomeStatInput = {
    value: v.optionalString('value', { min: 1, max: STAT_VALUE_MAX }),
    label: v.optionalString('label', { min: 2, max: STAT_LABEL_MAX }),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateHreasyOutcomesStatusBody(body: unknown): { status: ContentStatus } {
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
export function validateHreasyOutcomesReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', {
    max: Math.max(LIMITS.MAX_HREASY_OUTCOME_STORIES, LIMITS.MAX_HREASY_OUTCOME_STATS),
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

export function validateHreasyOutcomeStoryListQuery(query: Record<string, unknown>): {
  filters: HreasyOutcomeStoryFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: HreasyOutcomeStoryFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
