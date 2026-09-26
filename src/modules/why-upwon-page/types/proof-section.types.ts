// src/modules/why-upwon-page/types/proof-section.types.ts

import { ContentStatus } from '../../../config/constants';
import { HeadingLine } from '../../home-page/utils/heading-markup';
import { WhyUpwonIconName } from '../utils/icons';

/**
 * The product proof section: the copy over the dashboard artwork, with four
 * callouts pinned to the connectors drawn into it, each with an icon, a title
 * and a line of detail.
 *
 * Two shapes - the artwork is one record, the callouts a list. The corner a
 * callout sits in, and the colour its icon is drawn in, both follow display
 * order, so neither is stored - and the list is capped at the four corners the
 * artwork has connectors for. The
 * eyebrow, heading and subtext live once in page_section_copy under
 * ('why-upwon', 'proof').
 */

// ── the artwork panel ─────────────────────────────────────────────────────

export interface WhyUpwonProofPanel {
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

export interface ResolvedWhyUpwonProofPanel extends WhyUpwonProofPanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertWhyUpwonProofPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string;
}

// ── the callouts ──────────────────────────────────────────────────────

export interface WhyUpwonProofCallout {
  id: string;
  title: string;
  /** The line under the title. */
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: WhyUpwonIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWhyUpwonProofCalloutInput {
  title: string;
  description: string;
  icon: WhyUpwonIconName;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonProofCalloutInput = Partial<CreateWhyUpwonProofCalloutInput>;

export interface WhyUpwonProofCalloutFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderWhyUpwonProofCalloutsInput {
  ids: string[];
}

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no callout is active - the page then
 * keeps the section it ships. A missing panel keeps the site's artwork.
 */
export interface PublicWhyUpwonProofSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null when there is no panel, or it has no image - keep the site's own. */
  image: string | null;
  imageAlt: string | null;
  callouts: Array<{ title: string; description: string; icon: WhyUpwonIconName }>;
}
