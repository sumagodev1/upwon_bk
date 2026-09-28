// src/modules/industry-pages/spices-agro-page/types/coverage-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The industry coverage section: a heading over a grid of round photo tiles,
 * one per business category, each with its name under it.
 *
 * One list. The eyebrow, heading and subtext live once in page_section_copy
 * under ('spices-agro', 'coverage').
 */

// ── the categories ──────────────────────────────────────────────────────────

export interface SpicesAgroCoverageCategory {
  id: string;
  /** The photo. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The category's name, shown under the photo and read in place of it. */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The category with its two sources collapsed into the one URL to render. */
export interface ResolvedSpicesAgroCoverageCategory extends SpicesAgroCoverageCategory {
  image: string | null;
}

export interface CreateSpicesAgroCoverageCategoryInput {
  imageUrl: string | null;
  imageFileId: string | null;
  label: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSpicesAgroCoverageCategoryInput = Partial<CreateSpicesAgroCoverageCategoryInput>;

export interface SpicesAgroCoverageCategoryFilters {
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
 * Null when the copy is missing or no category has a live photo - the page
 * then keeps the section it ships.
 */
export interface PublicSpicesAgroCoverageSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  categories: Array<{ image: string; label: string }>;
}
