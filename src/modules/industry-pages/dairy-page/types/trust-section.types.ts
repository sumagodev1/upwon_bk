// src/modules/industry-pages/dairy-page/types/trust-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Join the food, dairy and FMCG brands running their operations on UpWon."
 *
 * One heading over two rotating parts: a wall of customer logos, then a card
 * of figures - each a value, a short label and the photograph shown with it.
 *
 * Two shapes rather than one, because they are two different edits - a logo is
 * added the day a brand goes live, a figure is revised when the numbers land.
 * The same split as the SFA-DMS proof section, less its card.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('dairy', 'trust').
 */

// ── the customer logos ────────────────────────────────────────────────────

export interface DairyTrustLogo {
  id: string;
  /** The mark. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The brand name, read in place of the image. */
  alt: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The logo with its two sources collapsed into the one URL to render. */
export interface ResolvedDairyTrustLogo extends DairyTrustLogo {
  image: string | null;
}

export interface CreateDairyTrustLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyTrustLogoInput = Partial<CreateDairyTrustLogoInput>;

export interface DairyTrustLogoFilters {
  status?: ContentStatus;
}

// ── the figures ───────────────────────────────────────────────────────────

export interface DairyTrustStat {
  id: string;
  /**
   * The figure as it is read: "25,000+", "2.5 Cr+". Text rather than a number,
   * because the strip renders it verbatim and the suffix carries as much
   * meaning as the digits.
   */
  value: string;
  label: string;
  /** The photograph beside the figure. Exclusive with imageFileId; one is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The figure with its two photo sources collapsed into the one URL to render. */
export interface ResolvedDairyTrustStat extends DairyTrustStat {
  image: string | null;
}

export interface CreateDairyTrustStatInput {
  value: string;
  label: string;
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyTrustStatInput = Partial<CreateDairyTrustStatInput>;

export interface DairyTrustStatFilters {
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
 * Null when the copy is missing, or when neither part has anything to show -
 * the page then leaves the section out.
 */
export interface PublicDairyTrustSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{ value: string; label: string; image: string }>;
}
