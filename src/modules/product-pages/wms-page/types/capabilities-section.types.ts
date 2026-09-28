// src/modules/product-pages/wms-page/types/capabilities-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The capability stack - "Everything From the Receiving Dock to the Dispatch
 * Bay - In One Flow."
 *
 * A heading and a line of subtext over a stack of bands. Each band is a
 * heading and a paragraph on one side and that capability's artwork on the
 * other, the sides alternating down the page.
 *
 * One shape, because a band is one thing: a name, a paragraph and a picture.
 *
 * Unlike the HREasy page's capability modules this keeps the title and the
 * description: there the panel's words are baked into the artwork, here they
 * are rendered text beside it. There is no slug either - that list is a
 * switcher needing a key its selected row survives a rename by, this stack is
 * read top to bottom with nothing selectable in it.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('wms', 'capabilities').
 */

export interface WmsCapabilityModule {
  id: string;
  /** The band's heading. */
  title: string;
  /** The paragraph under it. */
  description: string;
  /** The artwork. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** What a screen reader reads in its place. Null leaves it decorative. */
  imageAlt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A band with its two image sources collapsed into the one URL to render. */
export interface ResolvedWmsCapabilityModule extends WmsCapabilityModule {
  image: string | null;
}

export interface CreateWmsCapabilityModuleInput {
  title: string;
  description: string;
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export interface UpdateWmsCapabilityModuleInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  imageFileId?: string;
  /** `null` clears the alt text; absent leaves it alone. */
  imageAlt?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export interface WmsCapabilityModuleFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

/**
 * The whole section in one read: the copy above the stack and the bands in it.
 *
 * Null when the copy is missing or no band is drawable - the page then keeps
 * the stack it ships, which is a complete working one.
 */
export interface PublicWmsCapabilitiesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  modules: Array<{
    title: string;
    description: string;
    image: string;
    imageAlt: string | null;
  }>;
}
