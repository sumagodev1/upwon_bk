// src/modules/product-pages/pos-page/types/proof-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { PosIconName } from '../utils/icons';

/**
 * "Not a Pitch. Just What's Already Running."
 *
 * One heading over a single card holding two panels: a wall of customer brand
 * marks scrolling in two horizontal rows on the left, and a four-up row of
 * sourced counter-level numbers on the right.
 *
 * Two shapes, because they are two different edits - a logo is added the day a
 * chain goes live, and a figure is revised when the quarter's numbers land.
 *
 * The eyebrow, heading and subtext above both panels live once in
 * page_section_copy under ('pos', 'proof').
 */

// ── the brand wall ────────────────────────────────────────────────────────

export interface PosProofLogo {
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
export interface ResolvedPosProofLogo extends PosProofLogo {
  image: string | null;
}

export interface CreatePosProofLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosProofLogoInput = Partial<CreatePosProofLogoInput>;

export interface PosProofLogoFilters {
  status?: ContentStatus;
}

// ── the numbers ───────────────────────────────────────────────────────────

/**
 * Three fields where the FMS page's equivalent has five.
 *
 * That page draws its figures as separate cards, each with its own accent and
 * a second line naming the source. This one draws a single divided row in one
 * accent, with the source folded into the label ("faster billing (Kaka
 * Halwai)"), so there is no accentColor and no subtext to carry.
 */
export interface PosProofStat {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: PosIconName;
  /**
   * The figure as it is read: "6,000+", "Rs 23L+", "48%". Text rather than a
   * number, because the row renders it verbatim and the suffix carries as much
   * meaning as the digits.
   */
  value: string;
  /** What the figure counts, and where it comes from. */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePosProofStatInput {
  icon: PosIconName;
  value: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosProofStatInput = Partial<CreatePosProofStatInput>;

export interface PosProofStatFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read: the copy, the brand wall, and the numbers.
 *
 * Null when the copy is missing, or when neither panel has anything to show -
 * the page then keeps the strip it ships, which is a complete working one. One
 * empty panel is allowed: logos with no figures, or figures with no logos, is
 * still a section worth rendering.
 */
export interface PublicPosProofSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{ icon: PosIconName; value: string; label: string }>;
}
