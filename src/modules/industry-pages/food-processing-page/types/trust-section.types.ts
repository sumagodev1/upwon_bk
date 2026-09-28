// src/modules/industry-pages/food-processing-page/types/trust-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Powering Growth for Food Processing Businesses"
 *
 * One heading over two rows: a scrolling marquee of customer logos, then a row
 * of figures - each a value and a short label - beside a photograph (the panel).
 *
 * Two shapes rather than one, because they are two different edits - a logo is
 * added the day a brand goes live, a figure is revised when the numbers land.
 * The same split as the SFA-DMS proof section, less its card.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('food-processing', 'trust').
 */

// ── the customer logos ────────────────────────────────────────────────────

export interface FoodProcessingTrustLogo {
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
export interface ResolvedFoodProcessingTrustLogo extends FoodProcessingTrustLogo {
  image: string | null;
}

export interface CreateFoodProcessingTrustLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFoodProcessingTrustLogoInput = Partial<CreateFoodProcessingTrustLogoInput>;

export interface FoodProcessingTrustLogoFilters {
  status?: ContentStatus;
}

// ── the figures ───────────────────────────────────────────────────────────

export interface FoodProcessingTrustStat {
  id: string;
  /**
   * The figure as it is read: "25,000+", "2.5 Cr+". Text rather than a number,
   * because the strip renders it verbatim and the suffix carries as much
   * meaning as the digits.
   */
  value: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFoodProcessingTrustStatInput {
  value: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFoodProcessingTrustStatInput = Partial<CreateFoodProcessingTrustStatInput>;

export interface FoodProcessingTrustStatFilters {
  status?: ContentStatus;
}

// ── the photo panel ───────────────────────────────────────────────────────

/** The photograph on the left of the card. One record, read and replaced. */
export interface FoodProcessingTrustPanel {
  id: string;
  /** Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** Read aloud in place of the photograph. */
  alt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedFoodProcessingTrustPanel extends FoodProcessingTrustPanel {
  image: string | null;
}

/** A full replacement, not a patch. */
export interface UpsertFoodProcessingTrustPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
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
export interface PublicFoodProcessingTrustSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  panel: { image: string; alt: string } | null;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{ value: string; label: string }>;
}
