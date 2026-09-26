// src/modules/industry-pages/qsr-franchise-page/types/capabilities-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { QsrFranchiseIconName } from '../utils/icons';

/**
 * The core capabilities section: an artwork on the left, and on the right the
 * copy over a drifting row of numbered cards, each with an icon, a title and a
 * description.
 *
 * Two shapes - the artwork is one record, the capabilities a list. The number
 * printed on each card, and the colour its icon is drawn in, both follow
 * display order, so neither is stored. The
 * eyebrow, heading and subtext live once in page_section_copy under
 * ('qsr-franchise', 'capabilities').
 */

// ── the artwork panel ─────────────────────────────────────────────────────

export interface QsrFranchiseCapabilitiesPanel {
  id: string;
  /** The artwork. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** What the artwork shows, read in place of it. */
  imageAlt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedQsrFranchiseCapabilitiesPanel extends QsrFranchiseCapabilitiesPanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertQsrFranchiseCapabilitiesPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string;
}

// ── the capabilities ──────────────────────────────────────────────────────

export interface QsrFranchiseCapability {
  id: string;
  title: string;
  /** The line under the title. */
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: QsrFranchiseIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQsrFranchiseCapabilityInput {
  title: string;
  description: string;
  icon: QsrFranchiseIconName;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchiseCapabilityInput = Partial<CreateQsrFranchiseCapabilityInput>;

export interface QsrFranchiseCapabilityFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderQsrFranchiseCapabilitiesInput {
  ids: string[];
}

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no capability is active - the page then
 * keeps the section it ships. A missing panel keeps the site's artwork.
 */
export interface PublicQsrFranchiseCapabilitiesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null when there is no panel, or it has no image - keep the site's own. */
  image: string | null;
  imageAlt: string | null;
  capabilities: Array<{ title: string; description: string; icon: QsrFranchiseIconName }>;
}
