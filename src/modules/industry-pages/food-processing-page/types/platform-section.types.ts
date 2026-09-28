// src/modules/industry-pages/food-processing-page/types/platform-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "One Connected Platform for Every Food Processing Operation"
 *
 * Copy on the left, a grid of product tiles on the right - each tile a mark, a
 * name and a link through to that product's page.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('food-processing', 'platform').
 */

export interface FoodProcessingPlatformTile {
  id: string;
  label: string;
  /** Where the tile goes: '/products/erp', or an absolute URL. */
  href: string;
  /** The product mark. Exclusive with iconFileId, and one of the two is required. */
  iconUrl: string | null;
  iconFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedFoodProcessingPlatformTile extends FoodProcessingPlatformTile {
  icon: string | null;
}

export interface CreateFoodProcessingPlatformTileInput {
  label: string;
  href: string;
  iconUrl: string | null;
  iconFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFoodProcessingPlatformTileInput = Partial<CreateFoodProcessingPlatformTileInput>;

export interface FoodProcessingPlatformTileFilters {
  status?: ContentStatus;
}

export interface ReorderFoodProcessingPlatformTilesInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Null when the copy is missing or no tile is live - the page then keeps the
 * section it ships. A tile whose uploaded mark has been deleted is dropped
 * rather than published with a broken image.
 */
export interface PublicFoodProcessingPlatformSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  tiles: Array<{ label: string; href: string; icon: string }>;
}
