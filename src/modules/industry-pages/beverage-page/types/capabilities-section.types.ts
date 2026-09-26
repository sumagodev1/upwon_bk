// src/modules/industry-pages/beverage-page/types/capabilities-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * The core capabilities section: a centred heading over a tabbed viewer - the
 * capability titles on the left, the selected one's description and screenshot
 * on the right - on a background illustration.
 *
 * Two shapes - the background is one record, the capabilities a list. The
 * eyebrow, heading and subtext live once in page_section_copy under
 * ('beverage', 'capabilities').
 */

// ── the background panel ──────────────────────────────────────────────────

export interface BeverageCapabilitiesPanel {
  id: string;
  /** The illustration. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedBeverageCapabilitiesPanel extends BeverageCapabilitiesPanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one field. */
export interface UpsertBeverageCapabilitiesPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
}

// ── the capabilities ──────────────────────────────────────────────────────

export interface BeverageCapability {
  id: string;
  /** The tab label, and the screenshot's alt text. */
  title: string;
  /** The line over the screenshot when this tab is selected. */
  description: string;
  /** The screenshot. Exclusive with imageFileId; both null leaves the frame white. */
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedBeverageCapability extends BeverageCapability {
  image: string | null;
}

export interface CreateBeverageCapabilityInput {
  title: string;
  description: string;
  imageUrl: string | null;
  imageFileId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeverageCapabilityInput = Partial<CreateBeverageCapabilityInput>;

export interface BeverageCapabilityFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderBeverageCapabilitiesInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no capability is active - the page then
 * keeps the section it ships. A missing panel keeps the site's background.
 */
export interface PublicBeverageCapabilitiesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null when there is no panel, or it has no image - keep the site's own. */
  background: string | null;
  capabilities: Array<{ title: string; description: string; image: string | null }>;
}
