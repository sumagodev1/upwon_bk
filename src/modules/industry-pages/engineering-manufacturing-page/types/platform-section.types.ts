// src/modules/industry-pages/engineering-manufacturing-page/types/platform-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { EngineeringIconName } from '../utils/icons';

/**
 * The connected platform section ("How UpWon Helps"): copy on the left, an
 * illustration in the centre, and a list of connected workflows on the right.
 *
 * Two shapes - the centre panel is one record, the workflows a list. The
 * eyebrow, heading and subtext live once in page_section_copy under
 * ('engineering-manufacturing', 'platform').
 */

// ── the centre panel ──────────────────────────────────────────────────────

export interface EngineeringPlatformPanel {
  id: string;
  /** The illustration. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string;
  /** The small caps line over the workflow list. Null hides it. */
  listLabel: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedEngineeringPlatformPanel extends EngineeringPlatformPanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertEngineeringPlatformPanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string;
  listLabel: string | null;
}

// ── the workflows ─────────────────────────────────────────────────────────

export interface EngineeringPlatformWorkflow {
  id: string;
  label: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: EngineeringIconName;
  /** The icon's colour, as #RRGGBB. */
  accentColor: string;
  /** The square behind the icon, as #RRGGBB. */
  tintColor: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEngineeringPlatformWorkflowInput {
  label: string;
  icon: EngineeringIconName;
  accentColor: string;
  tintColor: string;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringPlatformWorkflowInput =
  Partial<CreateEngineeringPlatformWorkflowInput>;

export interface EngineeringPlatformWorkflowFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderEngineeringPlatformWorkflowsInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no workflow is active - the page then keeps
 * the section it ships. A missing panel is allowed: the site keeps its own
 * illustration and label.
 */
export interface PublicEngineeringPlatformSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null when there is no panel, or it has no image - keep the site's own. */
  image: string | null;
  imageAlt: string | null;
  /** Null when there is no panel; empty string when the label is turned off. */
  listLabel: string | null;
  workflows: Array<{
    label: string;
    icon: EngineeringIconName;
    accentColor: string;
    tintColor: string;
  }>;
}
