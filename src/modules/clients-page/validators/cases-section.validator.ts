// src/modules/clients-page/validators/cases-section.validator.ts

import { CONTENT_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator, Validator } from '../../../core/utils/validation';
import { validateContentUrl } from '../../home-page/utils/content-url';
import {
  CASE_SECTIONS,
  CaseSectionKey,
  ClientsCaseCardFilters,
  ClientsCaseStoryFields,
  CreateClientsCaseCardInput,
  ReorderClientsCaseCardsInput,
  UpdateClientsCaseCardInput,
} from '../types/cases-section.types';

/**
 * The case study itself: the card, and the story's text fields. The story's
 * lists are validated per row in story-rows.validator.ts.
 */

/** Matched against the source text, so the limits are authoring limits. */
const CATEGORY_MAX = 120;
const BRAND_MAX = 120;
const LOCATION_MAX = 120;
const SCALE_MAX = 300;
const HEADLINE_MAX = 300;
const STORY_URL_MAX = 500;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MAX = 100;
const DURATION_MAX = 200;
const ONE_LINE_MAX = 400;
const PARAGRAPH_MAX = 2000;
const TESTIMONIAL_QUOTE_MAX = 600;
const TESTIMONIAL_PERSON_MAX = 160;

/**
 * Strips the quotation marks the page draws for itself, so a pasted quote does
 * not render with two sets - the same rule as the ERP outcome cards.
 */
function stripQuoteMarks(value: string): string {
  return value.replace(/^["“‘']+|["”’']+$/g, '').trim();
}

function readHeadline(v: Validator, required: boolean): string | undefined {
  if (!required && !v.has('headline')) return undefined;
  const raw = v.requiredString('headline', { min: 3, max: HEADLINE_MAX });
  if (!raw) return undefined;

  const stripped = stripQuoteMarks(raw);
  v.custom(stripped.length >= 3, 'headline', 'headline must be at least 3 characters', 'TOO_SHORT');
  return stripped;
}

function readStoryUrl(v: Validator): string | null | undefined {
  // Absent leaves it alone; null or blank clears it (hides the link).
  const storyUrl = v.nullableString('storyUrl', { max: STORY_URL_MAX });
  if (storyUrl) validateContentUrl(v, 'storyUrl', storyUrl, 'INVALID_STORY_URL');
  return storyUrl;
}

function readSlug(v: Validator): string | null | undefined {
  // Absent leaves it alone; null or blank removes the story page.
  const slug = v.nullableString('slug', { max: SLUG_MAX });
  if (slug) {
    v.custom(
      SLUG_PATTERN.test(slug),
      'slug',
      'slug must be lowercase words separated by hyphens, e.g. kaka-halwai',
      'INVALID_SLUG',
    );
  }
  return slug;
}

/**
 * The story's text fields. `partial` is the update path: anything absent stays
 * undefined so the repository leaves it untouched.
 */
function readStory(v: Validator, partial: boolean): Partial<ClientsCaseStoryFields> {
  const text = (field: string, max: number) => {
    const value = v.nullableString(field, { max });
    return partial ? value : (value ?? null);
  };

  const story: Partial<ClientsCaseStoryFields> = {
    slug: partial ? readSlug(v) : (readSlug(v) ?? null),
    duration: text('duration', DURATION_MAX),
    challengeOneLine: text('challengeOneLine', ONE_LINE_MAX),
    challengeSummary: text('challengeSummary', PARAGRAPH_MAX),
    whyUpwon: text('whyUpwon', PARAGRAPH_MAX),
    testimonialQuote: text('testimonialQuote', TESTIMONIAL_QUOTE_MAX),
    testimonialAuthor: text('testimonialAuthor', TESTIMONIAL_PERSON_MAX),
    testimonialRole: text('testimonialRole', TESTIMONIAL_PERSON_MAX),
  };

  if (story.testimonialQuote) story.testimonialQuote = stripQuoteMarks(story.testimonialQuote);

  // The closing quote is drawn with its author and role; half of it is a card
  // with a hole in it. Checked across whichever of the three this body sends -
  // the testimonial form always sends all three together.
  const parts = [story.testimonialQuote, story.testimonialAuthor, story.testimonialRole];
  const touched = parts.filter((part) => part !== undefined);
  const filled = touched.filter(Boolean).length;
  v.custom(
    filled === 0 || filled === touched.length,
    'testimonialQuote',
    'Give the testimonial quote, author and role together, or leave all three blank',
    'INCOMPLETE_TESTIMONIAL',
  );

  return story;
}

export function validateCreateClientsCaseCard(body: unknown): CreateClientsCaseCardInput {
  const v = validator(body);

  const dto: CreateClientsCaseCardInput = {
    category: v.requiredString('category', { min: 2, max: CATEGORY_MAX }),
    brand: v.requiredString('brand', { min: 2, max: BRAND_MAX }),
    location: v.requiredString('location', { min: 2, max: LOCATION_MAX }),
    scale: v.nullableString('scale', { max: SCALE_MAX }) ?? null,
    headline: readHeadline(v, true) as string,
    storyUrl: readStoryUrl(v) ?? null,
    ...(readStory(v, false) as ClientsCaseStoryFields),
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

export function validateUpdateClientsCaseCard(body: unknown): UpdateClientsCaseCardInput {
  const v = validator(body);

  v.requireAtLeastOne([
    'category',
    'brand',
    'location',
    'scale',
    'headline',
    'storyUrl',
    'slug',
    'duration',
    'challengeOneLine',
    'challengeSummary',
    'whyUpwon',
    'testimonialQuote',
    'testimonialAuthor',
    'testimonialRole',
    'displayOrder',
    'status',
  ]);

  const dto: UpdateClientsCaseCardInput = {
    category: v.has('category')
      ? v.requiredString('category', { min: 2, max: CATEGORY_MAX })
      : undefined,
    brand: v.has('brand') ? v.requiredString('brand', { min: 2, max: BRAND_MAX }) : undefined,
    location: v.has('location')
      ? v.requiredString('location', { min: 2, max: LOCATION_MAX })
      : undefined,
    scale: v.nullableString('scale', { max: SCALE_MAX }),
    headline: readHeadline(v, false),
    storyUrl: readStoryUrl(v),
    ...readStory(v, true),
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  v.assert();
  return dto;
}

export function validateClientsCaseCardStatus(body: unknown): {
  status: 'ACTIVE' | 'INACTIVE';
} {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/** A story section's key in the URL, e.g. PUT /:id/sections/timeline/status. */
export function validateSectionParam(raw: unknown): CaseSectionKey {
  const v = validator({ section: raw });
  const section = v.requiredEnum('section', CASE_SECTIONS);
  v.assert();
  return section;
}

/** The complete id list in its new order - a whole-set rewrite. */
export function validateReorderClientsCaseCards(body: unknown): ReorderClientsCaseCardsInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_CLIENTS_CASE_CARDS });

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

export function validateClientsCaseCardListQuery(query: Record<string, unknown>): {
  filters: ClientsCaseCardFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: ClientsCaseCardFilters = { status: v.optionalEnum('status', CONTENT_STATUSES) };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
