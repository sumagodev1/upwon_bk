// src/modules/industry-pages/non-food-fmcg-page/types/benefits-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "Greater Control Over Every Channel." - the Benefits section: copy beside a grid of benefits, each an icon and a short label.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('non-food-fmcg', 'benefits').
 */

export interface NonFoodFmcgBenefitItem {
  id: string;
  /** A name from NON_FOOD_FMCG_ICON_NAMES - the site maps it to a lucide component. */
  icon: string;
  /** The benefit: "Product and inventory visibility". */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNonFoodFmcgBenefitItemInput {
  icon: string;
  label: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateNonFoodFmcgBenefitItemInput = Partial<CreateNonFoodFmcgBenefitItemInput>;

export interface NonFoodFmcgBenefitItemFilters {
  status?: ContentStatus;
}

export interface ReorderNonFoodFmcgBenefitItemsInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Null when the copy is missing or no benefit is live - the page then hides the
 * section.
 */
export interface PublicNonFoodFmcgBenefitsSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  items: Array<{ icon: string; label: string }>;
}
