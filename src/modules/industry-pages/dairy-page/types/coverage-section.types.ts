// src/modules/industry-pages/dairy-page/types/coverage-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Built for a Wide Range of Dairy & Ice Cream Businesses." - the Industry Coverage section: copy over a grid of sub-sector categories, each a name and an illustration.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('dairy', 'coverage').
 */

export interface DairyCoverageItem {
  id: string;
  /** The category name: "Milk Processing". */
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

export interface ResolvedDairyCoverageItem extends DairyCoverageItem {
  image: string | null;
}

export interface CreateDairyCoverageItemInput {
  label: string;
  imageUrl: string | null;
  imageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyCoverageItemInput = Partial<CreateDairyCoverageItemInput>;

export interface DairyCoverageItemFilters {
  status?: ContentStatus;
}

export interface ReorderDairyCoverageItemsInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Null when the copy is missing or no category is live - the page then hides the
 * section. An item whose uploaded artwork has been deleted is dropped rather than published with a broken image.
 */
export interface PublicDairyCoverageSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  items: Array<{ image: string; label: string }>;
}
