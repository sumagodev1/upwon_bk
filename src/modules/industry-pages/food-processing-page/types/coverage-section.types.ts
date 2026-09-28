// src/modules/industry-pages/food-processing-page/types/coverage-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Built for a Wide Range of Food Processing Businesses." - the Industry Coverage section: copy over a grid of sub-sector categories, each a name and an illustration.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('food-processing', 'coverage').
 */

export interface FoodProcessingCoverageItem {
  id: string;
  /** The category name: "Dairy Processing". */
  label: string;
  /** The illustration above the name. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedFoodProcessingCoverageItem extends FoodProcessingCoverageItem {
  image: string | null;
}

export interface CreateFoodProcessingCoverageItemInput {
  label: string;
  imageUrl: string | null;
  imageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFoodProcessingCoverageItemInput = Partial<CreateFoodProcessingCoverageItemInput>;

export interface FoodProcessingCoverageItemFilters {
  status?: ContentStatus;
}

export interface ReorderFoodProcessingCoverageItemsInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Null when the copy is missing or no category is live - the page then hides the
 * section. An item whose uploaded artwork has been deleted is dropped rather than published with a broken image.
 */
export interface PublicFoodProcessingCoverageSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  items: Array<{ image: string; label: string }>;
}
