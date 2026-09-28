// src/modules/product-pages/wms-page/types/recognition-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The warehouse-type map - "Built for All Types of Warehouses."
 *
 * An eyebrow, a heading and a line of subtext over a grid of cards, each
 * naming one kind of warehouse so a visitor finds their own operation in the
 * list immediately.
 *
 * One shape, because a card is one thing: a picture, a name and a line about
 * it. The POS page's equivalent stores an icon name instead - that grid is
 * drawn with lucide components - where this one is a wall of illustrations
 * and stores an image the way every other artwork slot in the CMS does.
 *
 * No alt text, unlike a proof slide: the title and description sit in the
 * markup directly under the picture, which makes the illustration decorative.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('wms', 'recognition').
 */

export interface WmsRecognitionCard {
  id: string;
  /** The kind of warehouse, as the card's heading. */
  title: string;
  /** The line under it. */
  description: string;
  /** The illustration. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A card with its two image sources collapsed into the one URL to render. */
export interface ResolvedWmsRecognitionCard extends WmsRecognitionCard {
  image: string | null;
}

export interface CreateWmsRecognitionCardInput {
  title: string;
  description: string;
  imageUrl: string | null;
  imageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWmsRecognitionCardInput = Partial<CreateWmsRecognitionCardInput>;

export interface WmsRecognitionCardFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

/**
 * The whole section in one read: the copy above the grid and the cards in it.
 *
 * Null when the copy is missing or no card is drawable - the page then keeps
 * the map it ships, which is a complete working one. A heading over an empty
 * grid is not a section, it is a hole.
 */
export interface PublicWmsRecognitionSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cards: Array<{ image: string; title: string; description: string }>;
}
