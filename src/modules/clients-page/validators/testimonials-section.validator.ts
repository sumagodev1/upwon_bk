// src/modules/clients-page/validators/testimonials-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import { validateContentUrl } from '../../home-page/utils/content-url';
import {
  ClientsTestimonialFilters,
  CreateClientsTestimonialInput,
  ReorderClientsTestimonialsInput,
  UpdateClientsTestimonialInput,
} from '../types/testimonials-section.types';

const QUOTE_MAX = 400;
const AUTHOR_MAX = 120;
const COMPANY_MAX = 120;
const AVATAR_URL_MAX = 1000;
const DEFAULT_FALLBACK_COLOR = '#E85A2A';
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Strips the quotation marks the card draws for itself, so a pasted quote does
 * not render with two sets - the same rule as the case cards.
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

function readColor(v: Validator, required: boolean): string | undefined {
  if (!v.has('fallbackColor')) return required ? DEFAULT_FALLBACK_COLOR : undefined;
  const value = v.optionalString('fallbackColor', { max: 7 });
  if (!value) return required ? DEFAULT_FALLBACK_COLOR : undefined;
  v.custom(
    HEX_COLOR.test(value),
    'fallbackColor',
    'fallbackColor must be a hex colour like #E85A2A',
    'INVALID_COLOR',
  );
  return value.toUpperCase();
}

export function validateCreateClientsTestimonial(body: unknown): CreateClientsTestimonialInput {
  const v = validator(body);

  const avatarUrl = v.nullableString('avatarUrl', { max: AVATAR_URL_MAX }) ?? null;
  if (avatarUrl) validateContentUrl(v, 'avatarUrl', avatarUrl, 'INVALID_IMAGE_URL');
  const avatarFileId = v.optionalUuid('avatarFileId') ?? null;

  // Mirrors clients_testimonials_single_avatar_source_check.
  v.custom(
    avatarUrl === null || avatarFileId === null,
    'avatarUrl',
    'Provide either avatarUrl or avatarFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: CreateClientsTestimonialInput = {
    quote: readQuote(v, true) as string,
    author: v.requiredString('author', { min: 2, max: AUTHOR_MAX }),
    company: v.requiredString('company', { min: 2, max: COMPANY_MAX }),
    rating: v.optionalNumber('rating', { min: 1, max: 5, integer: true }) ?? 5,
    avatarUrl,
    avatarFileId,
    fallbackColor: readColor(v, true) as string,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateClientsTestimonial(body: unknown): UpdateClientsTestimonialInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'quote',
    'author',
    'company',
    'rating',
    'avatarUrl',
    'avatarFileId',
    'fallbackColor',
    'displayOrder',
    'status',
  ]);

  // Absent leaves the photo alone; null or blank clears it (initials instead).
  const avatarUrl = v.nullableString('avatarUrl', { max: AVATAR_URL_MAX });
  if (avatarUrl) validateContentUrl(v, 'avatarUrl', avatarUrl, 'INVALID_IMAGE_URL');
  const avatarFileId = v.has('avatarFileId')
    ? (v.optionalUuid('avatarFileId') ?? null)
    : undefined;

  v.custom(
    !(avatarUrl && avatarFileId),
    'avatarUrl',
    'Provide either avatarUrl or avatarFileId, not both',
    'CONFLICTING_IMAGE_SOURCE',
  );

  const dto: UpdateClientsTestimonialInput = {
    quote: readQuote(v, false),
    author: v.has('author') ? v.requiredString('author', { min: 2, max: AUTHOR_MAX }) : undefined,
    company: v.has('company')
      ? v.requiredString('company', { min: 2, max: COMPANY_MAX })
      : undefined,
    rating: v.optionalNumber('rating', { min: 1, max: 5, integer: true }),
    avatarUrl,
    avatarFileId,
    fallbackColor: readColor(v, false),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateClientsTestimonialStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** The complete id list in its new order - a whole-set rewrite. */
export function validateReorderClientsTestimonials(
  body: unknown,
): ReorderClientsTestimonialsInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_CLIENTS_TESTIMONIALS });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one id', 'REQUIRED');

  // uuidArray dedupes silently; compare against the raw length to catch it.
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

export function validateClientsTestimonialListQuery(query: Record<string, unknown>): {
  filters: ClientsTestimonialFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ClientsTestimonialFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
