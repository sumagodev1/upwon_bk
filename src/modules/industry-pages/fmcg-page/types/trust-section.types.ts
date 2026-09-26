// src/modules/industry-pages/fmcg-page/types/trust-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Powering Growth for FMCG Distribution Businesses"
 *
 * One heading over two rows: a scrolling marquee of customer logos, then a row
 * of figures - each a value, a short label and a sentence explaining it.
 *
 * Two shapes rather than one, because they are two different edits - a logo is
 * added the day a brand goes live, a figure is revised when the numbers land.
 * The same split as the SFA-DMS proof section, less its card.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('fmcg', 'trust').
 */

// ── the customer logos ────────────────────────────────────────────────────

export interface FmcgTrustLogo {
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
export interface ResolvedFmcgTrustLogo extends FmcgTrustLogo {
  image: string | null;
}

export interface CreateFmcgTrustLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmcgTrustLogoInput = Partial<CreateFmcgTrustLogoInput>;

export interface FmcgTrustLogoFilters {
  status?: ContentStatus;
}

// ── the figures ───────────────────────────────────────────────────────────

export interface FmcgTrustStat {
  id: string;
  /**
   * The figure as it is read: "25,000+", "2.5 Cr+". Text rather than a number,
   * because the strip renders it verbatim and the suffix carries as much
   * meaning as the digits.
   */
  value: string;
  label: string;
  /** The sentence under the label that says where the figure comes from. */
  description: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFmcgTrustStatInput {
  value: string;
  label: string;
  description: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmcgTrustStatInput = Partial<CreateFmcgTrustStatInput>;

export interface FmcgTrustStatFilters {
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
 * Null when the copy is missing, or when neither row has anything to show -
 * the page then keeps the section it ships, which is a complete working one.
 */
export interface PublicFmcgTrustSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{ value: string; label: string; description: string }>;
}
