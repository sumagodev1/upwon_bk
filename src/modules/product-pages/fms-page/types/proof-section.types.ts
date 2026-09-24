// src/modules/product-pages/fms-page/types/proof-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { FmsIconName } from '../utils/icons';

/**
 * "Not a Pitch. Just What's Already Running."
 *
 * One heading over two panels: a wall of customer brand marks scrolling in
 * three columns on the left, and a two-by-two grid of sourced numbers on the
 * right.
 *
 * Two shapes, because they are two different edits - a logo is added the day a
 * network goes live, and a figure is revised when the quarter's numbers land.
 *
 * The eyebrow, heading and subtext above both panels live once in
 * page_section_copy under ('fms', 'proof').
 */

// ── the brand wall ────────────────────────────────────────────────────────

export interface FmsProofLogo {
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
export interface ResolvedFmsProofLogo extends FmsProofLogo {
  image: string | null;
}

export interface CreateFmsProofLogoInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsProofLogoInput = Partial<CreateFmsProofLogoInput>;

export interface FmsProofLogoFilters {
  status?: ContentStatus;
}

// ── the numbers ───────────────────────────────────────────────────────────

export interface FmsProofStat {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: FmsIconName;
  /** What the figure counts. */
  label: string;
  /** Where it comes from, which is what keeps the number honest. */
  subtext: string;
  /**
   * The figure as it is read: "200+", "1.5L+", "16". Text rather than a number,
   * because the grid renders it verbatim and the suffix carries as much meaning
   * as the digits.
   */
  value: string;
  /**
   * The card's accent, as #RRGGBB. The icon's tint is this at reduced alpha,
   * computed on the site rather than stored.
   */
  accentColor: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFmsProofStatInput {
  icon: FmsIconName;
  label: string;
  subtext: string;
  value: string;
  accentColor: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsProofStatInput = Partial<CreateFmsProofStatInput>;

export interface FmsProofStatFilters {
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
export interface PublicFmsProofSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  logos: Array<{ image: string; alt: string }>;
  stats: Array<{
    icon: FmsIconName;
    label: string;
    subtext: string;
    value: string;
    accentColor: string;
  }>;
}
