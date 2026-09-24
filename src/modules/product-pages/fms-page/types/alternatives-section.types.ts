// src/modules/product-pages/fms-page/types/alternatives-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { ComparisonRow, ComparisonValue } from '../../shared/comparison/comparison.types';

/**
 * "A POS With a Royalty Feature Is Not the Same as a Franchise Operating
 * System."
 *
 * The FMS page's comparison grid, on the shared comparison tables under
 * ('fms', 'alternatives') - no tables of its own, because comparison_sections
 * is keyed by page and section and this is the third grid to use it.
 *
 * Prose cells, not scores: the section's own subtext says "No star ratings" in
 * as many words, which is the opposite editorial choice from the SFA-DMS grid.
 * That is what the section's TEXT cellType selects.
 *
 * The eyebrow, heading and subtext above the grid live once in
 * page_section_copy under ('fms', 'alternatives').
 */

/** One cell as this grid stores it: a sentence against a column. */
export interface FmsAlternativeCell {
  columnId: string;
  content: string;
}

/** A row with its cells attached, in the shape the screens edit. */
export interface ResolvedFmsAlternativeRow extends ComparisonRow {
  cells: FmsAlternativeCell[];
}

export interface CreateFmsAlternativeRowInput {
  /** The leader cell - the criterion this row compares on. */
  parameter: string;
  displayOrder?: number;
  status: ContentStatus;
  /**
   * Replaces the row's cells wholesale - a column left out is cleared, which
   * is how a cell is emptied. A row is only ever edited as a whole line.
   */
  cells: FmsAlternativeCell[];
}

export interface UpdateFmsAlternativeRowInput {
  parameter?: string;
  displayOrder?: number;
  status?: ContentStatus;
  /** Absent leaves the cells alone; present replaces every one of them. */
  cells?: FmsAlternativeCell[];
}

export interface UpsertFmsAlternativesSectionInput {
  /** The leader column's header - "Criteria" on this grid. */
  leaderLabel: string;
  leaderDescription: string | null;
}

export interface CreateFmsAlternativesColumnInput {
  name: string;
  /** Exactly one column is ours; setting it clears the rest. */
  highlightColumn: boolean;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsAlternativesColumnInput = Partial<CreateFmsAlternativesColumnInput>;

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The whole grid in one read, flat rather than grouped: the design has no
 * bands, so the one category the rows hang off is unwrapped here.
 *
 * Cells arrive keyed by column id rather than by name, so the site matches
 * them up without knowing what any column is called.
 */
export interface PublicFmsAlternativesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** The leader column's header. */
  leaderLabel: string;
  columns: Array<{ id: string; name: string; highlight: boolean }>;
  rows: Array<{
    parameter: string;
    /** Keyed by column id. A column with nothing to say is simply absent. */
    cells: Record<string, string>;
  }>;
}

/** Narrowed from the shared value row, which also carries ratings and tones. */
export type FmsAlternativeValue = ComparisonValue;
