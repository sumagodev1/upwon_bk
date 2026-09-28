// src/modules/industry-pages/spices-agro-page/types/capabilities-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { SpicesAgroIconName } from '../utils/icons';

/**
 * The core capabilities section: a dark panel on a background illustration,
 * the copy on its left and a numbered grid of capabilities on its right, each
 * with an icon, a title and a description.
 *
 * Two shapes - the background is one record, the capabilities a list. The
 * number printed on each follows display order, so it is not stored. The
 * eyebrow, heading and subtext live once in page_section_copy under
 * ('spices-agro', 'capabilities').
 */

// ── the background panel ──────────────────────────────────────────────────

export interface SpicesAgroCapabilitiesPanel {
  id: string;
  /** The illustration. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedSpicesAgroCapabilitiesPanel extends SpicesAgroCapabilitiesPanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one field. */
export interface UpsertSpicesAgroCapabilitiesPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
}

// ── the capabilities ──────────────────────────────────────────────────────

export interface SpicesAgroCapability {
  id: string;
  title: string;
  /** The line under the title. */
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: SpicesAgroIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSpicesAgroCapabilityInput {
  title: string;
  description: string;
  icon: SpicesAgroIconName;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSpicesAgroCapabilityInput = Partial<CreateSpicesAgroCapabilityInput>;

export interface SpicesAgroCapabilityFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderSpicesAgroCapabilitiesInput {
  ids: string[];
}

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no capability is active - the page then
 * keeps the section it ships. A missing panel keeps the site's background.
 */
export interface PublicSpicesAgroCapabilitiesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null when there is no panel, or it has no image - keep the site's own. */
  background: string | null;
  capabilities: Array<{ title: string; description: string; icon: SpicesAgroIconName }>;
}
