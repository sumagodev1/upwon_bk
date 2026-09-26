// src/modules/industry-pages/engineering-manufacturing-page/types/coverage-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { EngineeringIconName } from '../utils/icons';

/**
 * The industry coverage section: copy at the top, a decorative illustration
 * behind it on the right, and a grid of the business types UpWon serves.
 *
 * Two shapes - the panel is one record, the categories a list. The eyebrow,
 * heading and subtext live once in page_section_copy under
 * ('engineering-manufacturing', 'coverage').
 */

// ── the background panel ──────────────────────────────────────────────────

export interface EngineeringCoveragePanel {
  id: string;
  /** The illustration. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedEngineeringCoveragePanel extends EngineeringCoveragePanel {
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertEngineeringCoveragePanelInput {
  imageUrl: string | null;
  imageFileId: string | null;
}

// ── the categories ────────────────────────────────────────────────────────

export interface EngineeringCoverageCategory {
  id: string;
  label: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: EngineeringIconName;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEngineeringCoverageCategoryInput {
  label: string;
  icon: EngineeringIconName;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringCoverageCategoryInput =
  Partial<CreateEngineeringCoverageCategoryInput>;

export interface EngineeringCoverageCategoryFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderEngineeringCoverageCategoriesInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole section in one read.
 *
 * Null when the copy is missing or no category is active - the page then keeps
 * the section it ships. A missing panel is allowed: the site keeps its own
 * illustration.
 */
export interface PublicEngineeringCoverageSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** Null when there is no panel, or it has no image - keep the site's own. */
  image: string | null;
  categories: Array<{ label: string; icon: EngineeringIconName }>;
}
