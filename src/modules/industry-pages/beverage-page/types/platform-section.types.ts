// src/modules/industry-pages/beverage-page/types/platform-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { BeverageIconName } from '../utils/icons';

/**
 * The connected platform section ("How UpWon Helps"): copy and a grid of
 * connected workflows, over a background banner.
 *
 * Two shapes - the panel is one record (the background and the label over the
 * grid), the workflows a list. The eyebrow, heading and subtext live once in
 * page_section_copy under ('beverage', 'platform').
 */

// ── the panel ─────────────────────────────────────────────────────────────

export interface BeveragePlatformPanel {
  id: string;
  /** The background. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The line over the workflow grid. Null hides it. */
  listLabel: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedBeveragePlatformPanel extends BeveragePlatformPanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertBeveragePlatformPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  listLabel: string | null;
}

// ── the workflows ─────────────────────────────────────────────────────────

export interface BeveragePlatformWorkflow {
  id: string;
  label: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: BeverageIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBeveragePlatformWorkflowInput {
  label: string;
  icon: BeverageIconName;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeveragePlatformWorkflowInput =
  Partial<CreateBeveragePlatformWorkflowInput>;

export interface BeveragePlatformWorkflowFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderBeveragePlatformWorkflowsInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no workflow is active - the page then keeps
 * the section it ships. A missing panel is allowed: the site keeps its own
 * background and label.
 */
export interface PublicBeveragePlatformSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null when there is no panel, or it has no image - keep the site's own. */
  image: string | null;
  /** Null when there is no panel; empty string when the label is turned off. */
  listLabel: string | null;
  workflows: Array<{
    label: string;
    icon: BeverageIconName;
  }>;
}
