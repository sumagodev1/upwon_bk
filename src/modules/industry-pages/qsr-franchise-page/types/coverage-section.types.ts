// src/modules/industry-pages/qsr-franchise-page/types/coverage-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { QsrFranchiseIconName } from '../utils/icons';

/**
 * The industry coverage section: a heading over a drifting row of cards, one
 * per business format, each a photo with an icon badge on its lower edge and
 * the format's name under it.
 *
 * One list. The eyebrow, heading and subtext live once in page_section_copy
 * under ('qsr-franchise', 'coverage').
 */

// ── the categories ──────────────────────────────────────────────────────────

export interface QsrFranchiseCoverageCategory {
  id: string;
  /** The photo. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The format's name, shown under the photo. */
  label: string;
  /** A name from the icon allowlist, drawn in the badge on the photo. */
  icon: QsrFranchiseIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The category with its two sources collapsed into the one URL to render. */
export interface ResolvedQsrFranchiseCoverageCategory extends QsrFranchiseCoverageCategory {
  image: string | null;
}

export interface CreateQsrFranchiseCoverageCategoryInput {
  imageUrl: string | null;
  imageFileId: string | null;
  label: string;
  icon: QsrFranchiseIconName;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchiseCoverageCategoryInput = Partial<CreateQsrFranchiseCoverageCategoryInput>;

export interface QsrFranchiseCoverageCategoryFilters {
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
export interface PublicQsrFranchiseCoverageSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  categories: Array<{ image: string; label: string; icon: QsrFranchiseIconName }>;
}
