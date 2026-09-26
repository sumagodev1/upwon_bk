// src/modules/industry-pages/qsr-franchise-page/types/platform-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { QsrFranchiseIconName } from '../utils/icons';

/**
 * The connected platform section ("How UpWon Helps"): copy, a grid of
 * connected workflows and a closing line on the left, and the app artwork on
 * the right.
 *
 * Two shapes - the panel is one record (the artwork, the label over the grid
 * and the closing line), the workflows a list. The eyebrow, heading and subtext live once in
 * page_section_copy under ('qsr-franchise', 'platform').
 */

// ── the panel ─────────────────────────────────────────────────────────────

export interface QsrFranchisePlatformPanel {
  id: string;
  /** The artwork. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** What the artwork shows, read in place of it. */
  imageAlt: string;
  /** The line over the workflow grid. Null hides it. */
  listLabel: string | null;
  /** The bold line beside the badge under the grid. Null hides the closing line. */
  closingTitle: string | null;
  /** The smaller line under it. Null leaves the title on its own. */
  closingSubtext: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedQsrFranchisePlatformPanel extends QsrFranchisePlatformPanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertQsrFranchisePlatformPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string;
  listLabel: string | null;
  closingTitle: string | null;
  closingSubtext: string | null;
}

// ── the workflows ─────────────────────────────────────────────────────────

export interface QsrFranchisePlatformWorkflow {
  id: string;
  label: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: QsrFranchiseIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQsrFranchisePlatformWorkflowInput {
  label: string;
  icon: QsrFranchiseIconName;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchisePlatformWorkflowInput =
  Partial<CreateQsrFranchisePlatformWorkflowInput>;

export interface QsrFranchisePlatformWorkflowFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderQsrFranchisePlatformWorkflowsInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no workflow is active - the page then keeps
 * the section it ships. A missing panel is allowed: the site keeps its own
 * artwork, label and closing line.
 */
export interface PublicQsrFranchisePlatformSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null when there is no panel, or it has no image - keep the site's own. */
  image: string | null;
  imageAlt: string | null;
  /** Null when there is no panel; empty string when the label is turned off. */
  listLabel: string | null;
  /** Null when there is no panel; empty strings when turned off. */
  closingTitle: string | null;
  closingSubtext: string | null;
  workflows: Array<{
    label: string;
    icon: QsrFranchiseIconName;
  }>;
}
