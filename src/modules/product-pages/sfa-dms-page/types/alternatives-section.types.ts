// src/modules/product-pages/sfa-dms-page/types/alternatives-section.types.ts

import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { ComparisonTone } from '../../shared/comparison/comparison.types';

/**
 * "A Smarter App for Your Field Team Is Not the Same as One Connected System."
 *
 * The same five records the ERP page's grid uses - a section, its columns, its
 * rows and their cells - stored in the shared comparison tables under
 * ('sfa-dms', 'alternatives'). Only the drawing differs: each cell is a score
 * out of five rather than a sentence, and the table closes on a
 * cost-of-ownership row whose cells are short coloured badges.
 *
 * Which is why the write surface is this module's own while the storage is
 * shared: an administrator filling in this grid types numbers, not prose, and
 * a validator that accepts both would accept neither properly.
 *
 * The section has one category. The design has no bands - it is a flat list of
 * capabilities - so the category exists only because a row must belong to one,
 * and no screen surfaces it.
 *
 * The eyebrow, heading and subtext above the grid live once in
 * page_section_copy under ('sfa-dms', 'alternatives').
 */

/** A capability row as the admin submits it: one score per column. */
export interface SfaRatingCellInput {
  columnId: string;
  /** 0-5, where 0 is the dash the grid draws for "not available natively". */
  rating: number;
}

export interface CreateSfaCapabilityRowInput {
  parameter: string;
  displayOrder?: number;
  status: 'ACTIVE' | 'INACTIVE';
  ratings: SfaRatingCellInput[];
}

export type UpdateSfaCapabilityRowInput = Partial<CreateSfaCapabilityRowInput>;

/** A summary row's cells: a short badge and the tone to draw it in. */
export interface SfaSummaryCellInput {
  columnId: string;
  label: string;
  tone: ComparisonTone;
}

export interface UpsertSfaSummaryRowInput {
  parameter: string;
  cells: SfaSummaryCellInput[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/**
 * The whole grid in one read.
 *
 * Flat rather than grouped: the design has no bands, so the one category is
 * unwrapped here and the site receives the rows it draws.
 *
 * Null when the copy or the section is missing, or when the grid has no
 * columns or no rows - the page then keeps the table it ships, which is a
 * complete working one.
 */
export interface PublicSfaAlternativesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** The header over the leader column, e.g. "Capability". */
  leaderLabel: string;
  columns: Array<{ id: string; name: string; highlight: boolean }>;
  rows: Array<{
    parameter: string;
    /**
     * Keyed by column id. A column with no cell is absent, which the grid
     * draws as the dash - the same as an explicit zero.
     */
    ratings: Record<string, number>;
  }>;
  /** The closing line. Null when none has been authored. */
  summary: {
    parameter: string;
    /** Keyed by column id. */
    cells: Record<string, { label: string; tone: ComparisonTone }>;
  } | null;
}
