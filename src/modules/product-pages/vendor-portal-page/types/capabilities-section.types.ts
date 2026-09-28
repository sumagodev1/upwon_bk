// src/modules/product-pages/vendor-portal-page/types/capabilities-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The capability carousel - RFQ management, rate contracts, vendor login, PO
 * tracking, QC, the performance matrix and payments.
 *
 * Seven cards the visitor scrolls sideways through, each a screenshot with a
 * title and a line.
 *
 * No number field. The cards read 01 to 07 on the page, but that is their
 * position rather than their identity - storing it would let an editor
 * reorder the carousel and leave the numbers scrambled behind them. The site
 * takes the number from the index.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('vms', 'capabilities').
 */

export interface VmsCapabilityCard {
  id: string;
  title: string;
  description: string;
  /** The screenshot. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** What a screen reader reads in its place. Null falls back to the title. */
  imageAlt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A card with its two image sources collapsed into the one URL to render. */
export interface ResolvedVmsCapabilityCard extends VmsCapabilityCard {
  image: string | null;
}

export interface CreateVmsCapabilityCardInput {
  title: string;
  description: string;
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateVmsCapabilityCardInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  imageFileId?: string;
  /** `null` clears the alt text; absent leaves it alone. */
  imageAlt?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface VmsCapabilityCardFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

/**
 * The whole section in one read: the copy above the carousel and the cards in
 * it.
 *
 * Null when the copy is missing or no card is drawable - the page then keeps
 * the carousel it ships, which is a complete working one.
 */
export interface PublicVmsCapabilitiesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cards: Array<{
    title: string;
    description: string;
    image: string;
    imageAlt: string | null;
  }>;
}
