// src/modules/industry-pages/bakery-page/types/helps-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "One Connected Platform for Your Bakery Operations" - the How UpWON Helps
 * section: copy over one full-width diagram.
 *
 * A list with one row live at a time, like the SFA-DMS video: a replacement
 * diagram can be uploaded and checked beside the live one, then switched over
 * with the status toggle.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('bakery', 'helps').
 */

export interface BakeryHelpVisual {
  id: string;
  /** The diagram. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The diagram carries the section's content, so its description is required. */
  alt: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedBakeryHelpVisual extends BakeryHelpVisual {
  image: string | null;
}

export interface CreateBakeryHelpVisualInput {
  imageUrl: string | null;
  imageFileId: string | null;
  alt: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBakeryHelpVisualInput = Partial<CreateBakeryHelpVisualInput>;

export interface BakeryHelpVisualFilters {
  status?: ContentStatus;
}

export interface ReorderBakeryHelpVisualsInput {
  ids: string[];
}

/**
 * The website-facing shape: the copy and the one live diagram.
 *
 * Null when either is missing - the page then keeps the section it ships.
 */
export interface PublicBakeryHelpsSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  image: string;
  alt: string;
}
