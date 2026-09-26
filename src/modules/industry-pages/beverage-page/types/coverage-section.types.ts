// src/modules/industry-pages/beverage-page/types/coverage-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { BeverageIconName } from '../utils/icons';

/**
 * The industry coverage section: a centred heading over a grid of beverage
 * categories, each with an icon badge, a name and a line under it.
 *
 * One list. The badge colours cycle by position in the site's own code, so
 * they are not part of a row. The eyebrow, heading and subtext live once in
 * page_section_copy under ('beverage', 'coverage').
 */

export interface BeverageCoverageCategory {
  id: string;
  label: string;
  /** The line under the name. */
  detail: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: BeverageIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBeverageCoverageCategoryInput {
  label: string;
  detail: string;
  icon: BeverageIconName;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeverageCoverageCategoryInput = Partial<CreateBeverageCoverageCategoryInput>;

export interface BeverageCoverageCategoryFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderBeverageCoverageCategoriesInput {
  ids: string[];
}

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no category is active - the page then
 * keeps the section it ships.
 */
export interface PublicBeverageCoverageSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  categories: Array<{ label: string; detail: string; icon: BeverageIconName }>;
}
