// src/modules/why-upwon-page/validators/testimonials-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import { validateLinkHref, validateMediaUrl } from '../utils/link';
import {
  CreateWhyUpwonClientLogoInput,
  CreateWhyUpwonTestimonialInput,
  ReorderInput,
  UpdateWhyUpwonClientLogoInput,
  UpdateWhyUpwonTestimonialInput,
  UpsertWhyUpwonTestimonialsPanelInput,
  WhyUpwonClientLogoFilters,
  WhyUpwonTestimonialFilters,
} from '../types/testimonials-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const ALT_MAX = 255;
const QUOTE_MAX = 600;
const NAME_MAX = 160;
const META_MAX = 120;
const LINE_MAX = 160;
const BUTTON_LABEL_MAX = 120;
const BUTTON_HREF_MAX = 500;

// ── the client wall ───────────────────────────────────────────────────────

/**
 * Reads the image pair.
 *
 * On create exactly one source is required - a logo row exists only to show a
 * mark. On update either may be absent, meaning "leave it alone", but the two
 * still cannot arrive together, and the repository clears the other side when
 * one is set.
 */
function readImagePair(
  v: Validator,
  required: boolean,
): { imageUrl: string | null | undefined; imageFileId: string | null | undefined } {
  const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
  const imageFileId = v.optionalUuid('imageFileId') ?? null;

  // Mirrors why_upwon_client_logos_single_image_source_check.
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

export function validateCreateWhyUpwonClientLogo(body: unknown): CreateWhyUpwonClientLogoInput {
  const v = validator(body);
  const { imageUrl, imageFileId } = readImagePair(v, true);

  const dto: CreateWhyUpwonClientLogoInput = {
    imageUrl: imageUrl ?? null,
    imageFileId: imageFileId ?? null,
    alt: v.requiredString('alt', { min: 1, max: ALT_MAX }),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateWhyUpwonClientLogo(body: unknown): UpdateWhyUpwonClientLogoInput {
  const v = validator(body);

  v.requireAtLeastOne(['imageUrl', 'imageFileId', 'alt', 'displayOrder', 'status']);
  const { imageUrl, imageFileId } = readImagePair(v, false);

  const dto: UpdateWhyUpwonClientLogoInput = {
    imageUrl,
    imageFileId,
    alt: v.has('alt') ? v.requiredString('alt', { min: 1, max: ALT_MAX }) : undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateWhyUpwonClientLogoListQuery(query: Record<string, unknown>): {
  filters: WhyUpwonClientLogoFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: WhyUpwonClientLogoFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the testimonials ──────────────────────────────────────────────────────

/**
 * Reads the logo pair. On create exactly one source is required - the card
 * shows the logo where a portrait would go - and on update either may be
 * absent, meaning "leave it alone".
 */
function readLogoPair(
  v: Validator,
  required: boolean,
): { logoUrl: string | null | undefined; logoFileId: string | null | undefined } {
  const logoUrl = v.optionalString('logoUrl', { max: IMAGE_URL_MAX }) ?? null;
  if (logoUrl) validateMediaUrl(v, 'logoUrl', logoUrl);
  const logoFileId = v.optionalUuid('logoFileId') ?? null;

  // Mirrors why_upwon_testimonials_single_logo_source_check.
  v.custom(
    logoUrl === null || logoFileId === null,
    'logoUrl',
    'Provide either logoUrl or logoFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  if (required) {
    v.custom(
      logoUrl !== null || logoFileId !== null,
      'logoUrl',
      "A testimonial needs the brand's logo: give either logoUrl or logoFileId",
      'REQUIRED',
    );
    return { logoUrl, logoFileId };
  }

  return {
    logoUrl: v.has('logoUrl') ? logoUrl : undefined,
    logoFileId: v.has('logoFileId') ? logoFileId : undefined,
  };
}

/** An optional line: blank or absent is stored as null. */
const optionalLine = (v: Validator, field: string, max: number): string | null =>
  v.optionalString(field, { max }) || null;

export function validateCreateWhyUpwonTestimonial(body: unknown): CreateWhyUpwonTestimonialInput {
  const v = validator(body);
  const { logoUrl, logoFileId } = readLogoPair(v, true);

  const dto: CreateWhyUpwonTestimonialInput = {
    quote: v.requiredString('quote', { min: 10, max: QUOTE_MAX }),
    author: v.requiredString('author', { min: 2, max: NAME_MAX }),
    role: v.requiredString('role', { min: 2, max: NAME_MAX }),
    brand: v.requiredString('brand', { min: 2, max: NAME_MAX }),
    category: optionalLine(v, 'category', META_MAX),
    location: optionalLine(v, 'location', META_MAX),
    logoUrl: logoUrl ?? null,
    logoFileId: logoFileId ?? null,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateWhyUpwonTestimonial(body: unknown): UpdateWhyUpwonTestimonialInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'quote',
    'author',
    'role',
    'brand',
    'category',
    'location',
    'logoUrl',
    'logoFileId',
    'displayOrder',
    'status',
  ]);
  const { logoUrl, logoFileId } = readLogoPair(v, false);

  const dto: UpdateWhyUpwonTestimonialInput = {
    quote: v.has('quote') ? v.requiredString('quote', { min: 10, max: QUOTE_MAX }) : undefined,
    author: v.has('author') ? v.requiredString('author', { min: 2, max: NAME_MAX }) : undefined,
    role: v.has('role') ? v.requiredString('role', { min: 2, max: NAME_MAX }) : undefined,
    brand: v.has('brand') ? v.requiredString('brand', { min: 2, max: NAME_MAX }) : undefined,
    category: v.has('category') ? optionalLine(v, 'category', META_MAX) : undefined,
    location: v.has('location') ? optionalLine(v, 'location', META_MAX) : undefined,
    logoUrl,
    logoFileId,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateWhyUpwonTestimonialListQuery(query: Record<string, unknown>): {
  filters: WhyUpwonTestimonialFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: WhyUpwonTestimonialFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the panel ─────────────────────────────────────────────────────────────

/**
 * A full replacement: every field is read, and an absent one means "hide it".
 * The button takes both halves or neither.
 */
export function validateUpsertWhyUpwonTestimonialsPanel(
  body: unknown,
): UpsertWhyUpwonTestimonialsPanelInput {
  const v = validator(body);

  const buttonLabel = optionalLine(v, 'buttonLabel', BUTTON_LABEL_MAX);
  const buttonHref = optionalLine(v, 'buttonHref', BUTTON_HREF_MAX);
  if (buttonHref) validateLinkHref(v, 'buttonHref', buttonHref);

  // Mirrors why_upwon_testimonials_panel_button_pair_check.
  v.custom(
    (buttonLabel === null) === (buttonHref === null),
    'buttonLabel',
    'Give the button both a label and a destination, or leave both empty',
    'INCOMPLETE_BUTTON',
  );

  const dto: UpsertWhyUpwonTestimonialsPanelInput = {
    leadLine: optionalLine(v, 'leadLine', LINE_MAX),
    buttonLabel,
    buttonHref,
    wallLabel: optionalLine(v, 'wallLabel', LINE_MAX),
  };

  v.assert();
  return dto;
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateWhyUpwonTestimonialsStatusBody(body: unknown): { status: ContentStatus } {
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

export const validateWhyUpwonClientLogoReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_WHY_UPWON_CLIENT_LOGOS);

export const validateWhyUpwonTestimonialReorder = (body: unknown): ReorderInput =>
  validateReorder(body, LIMITS.MAX_WHY_UPWON_TESTIMONIALS);
