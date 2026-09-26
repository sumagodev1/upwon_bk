// src/modules/industry-pages/sweets-page/types/platform-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "One Connected Platform for Every Sweets & Namkeen Operation"
 *
 * Copy on the left, a grid of product tiles on the right - each tile a mark, a
 * name and a link through to that product's page.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('sweets', 'platform').
 */

export interface SweetsPlatformTile {
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

export interface ResolvedSweetsPlatformTile extends SweetsPlatformTile {
  icon: string | null;
}

export interface CreateSweetsPlatformTileInput {
  label: string;
  href: string;
  iconUrl: string | null;
  iconFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSweetsPlatformTileInput = Partial<CreateSweetsPlatformTileInput>;

export interface SweetsPlatformTileFilters {
  status?: ContentStatus;
}

export interface ReorderSweetsPlatformTilesInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * Null when the copy is missing or no tile is live - the page then keeps the
 * section it ships. A tile whose uploaded mark has been deleted is dropped
 * rather than published with a broken image.
 */
export interface PublicSweetsPlatformSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  tiles: Array<{ label: string; href: string; icon: string }>;
}
