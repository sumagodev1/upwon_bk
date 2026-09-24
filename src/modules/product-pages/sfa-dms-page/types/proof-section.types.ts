// src/modules/product-pages/sfa-dms-page/types/proof-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Not a Pitch. Just What's Already Running."
 *
 * One heading over two panels: a single card on the left carrying a claim, a
 * paragraph, a link and a marquee of customer logos; a two-by-two grid of
 * numbers on the right.
 *
 * Three shapes rather than one, because they are three different edits. The
 * card's wording is rewritten; a logo is added the day a brand goes live; a
 * figure is revised when the quarter's numbers land.
 *
 * The eyebrow and heading above both panels live once in page_section_copy
 * under ('sfa-dms', 'proof').
 */

// ── the left card ─────────────────────────────────────────────────────────

export interface SfaProofPanel {
  id: string;
  heading: string;
  bodyText: string;
  /** The link under the paragraph. Both halves or neither. */
  linkLabel: string | null;
  linkHref: string | null;
  /** The small caps line above the marquee. Null renders the logos bare. */
  logosLabel: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A full replacement, not a patch.
 *
 * The card is one short form, so a partial update would only add a way for the
 * link to drift out of step with the paragraph that introduces it.
 */
export interface UpsertSfaProofPanelInput {
  heading: string;
  bodyText: string;
  linkLabel: string | null;
  linkHref: string | null;
  logosLabel: string | null;
}

// ── the customer logos ────────────────────────────────────────────────────

export interface SfaProofLogo {
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
export interface ResolvedSfaProofLogo extends SfaProofLogo {
  image: string | null;
}

export interface CreateSfaProofLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaProofLogoInput = Partial<CreateSfaProofLogoInput>;

export interface SfaProofLogoFilters {
  status?: ContentStatus;
}

// ── the numbers ───────────────────────────────────────────────────────────

export interface SfaProofStat {
  id: string;
  /**
   * The figure as it is read: "5,000+", "40%", "50+". Text rather than a
   * number, because the grid renders it verbatim and the suffix carries as
   * much meaning as the digits.
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

export interface CreateSfaProofStatInput {
  value: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaProofStatInput = Partial<CreateSfaProofStatInput>;

export interface SfaProofStatFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read: the copy, the card with its logos, and the
 * numbers.
 *
 * Null when the copy is missing, or when neither panel has anything to show -
 * the page then keeps the section it ships, which is a complete working one.
 */
export interface PublicSfaProofSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  panel: {
    heading: string;
    bodyText: string;
    linkLabel: string | null;
    linkHref: string | null;
    logosLabel: string | null;
  } | null;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{ value: string; label: string }>;
}
