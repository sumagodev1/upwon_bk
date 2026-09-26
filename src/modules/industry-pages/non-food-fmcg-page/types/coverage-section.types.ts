// src/modules/industry-pages/non-food-fmcg-page/types/coverage-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Built for a Wide Range of Non-Food FMCG Businesses." - the Industry Coverage section: copy, the dashboard image, then a grid of categories, each an icon and a name.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('non-food-fmcg', 'coverage').
 */

export interface NonFoodFmcgCoverageItem {
  id: string;
  /** A name from NON_FOOD_FMCG_ICON_NAMES - the site maps it to a lucide component. */
  icon: string;
  /** The category name: "Personal Care Products". */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNonFoodFmcgCoverageItemInput {
  icon: string;
  label: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateNonFoodFmcgCoverageItemInput = Partial<CreateNonFoodFmcgCoverageItemInput>;

export interface NonFoodFmcgCoverageItemFilters {
  status?: ContentStatus;
}

export interface ReorderNonFoodFmcgCoverageItemsInput {
  ids: string[];
}

// ── the panel image ───────────────────────────────────────────────────────

/** The dashboard image between the copy and the categories. One record, read and replaced. */
export interface NonFoodFmcgCoveragePanel {
  id: string;
  /** Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** Read aloud in place of the image. */
  alt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedNonFoodFmcgCoveragePanel extends NonFoodFmcgCoveragePanel {
  image: string | null;
}

/** A full replacement, not a patch. */
export interface UpsertNonFoodFmcgCoveragePanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
}

/**
 * The website-facing shape.
 *
 * Null when the copy is missing or no category is live - the page then hides the
 * section.
 */
export interface PublicNonFoodFmcgCoverageSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  panel: { image: string; alt: string } | null;
  items: Array<{ icon: string; label: string }>;
}
