// src/modules/why-upwon-page/types/industries-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';

/**
 * The industry trust section: a heading over a row of cards, one per
 * manufacturing environment UpWon runs in - a photo, the industry's name, and
 * a link to the page that covers it.
 *
 * One list. The eyebrow, heading and subtext live once in page_section_copy
 * under ('why-upwon', 'industries').
 */

// ── the industries ──────────────────────────────────────────────────────────

export interface WhyUpwonIndustry {
  id: string;
  /** The photo. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The industry's name, shown under the photo. */
  label: string;
  /** Where the card leads: a site path or an absolute URL. */
  href: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The industry with its two sources collapsed into the one URL to render. */
export interface ResolvedWhyUpwonIndustry extends WhyUpwonIndustry {
  image: string | null;
}

export interface CreateWhyUpwonIndustryInput {
  imageUrl: string | null;
  imageFileId: string | null;
  label: string;
  href: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonIndustryInput = Partial<CreateWhyUpwonIndustryInput>;

export interface WhyUpwonIndustryFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no industry has a live photo - the page then
 * keeps the section it ships.
 */
export interface PublicWhyUpwonIndustrySection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  industries: Array<{ image: string; label: string; href: string }>;
}
