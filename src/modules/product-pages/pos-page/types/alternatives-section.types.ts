// src/modules/product-pages/pos-page/types/alternatives-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { ComparisonRow, ComparisonValue } from '../../shared/comparison/comparison.types';

/**
 * "A POS With a Royalty Feature Is Not the Same as a Franchise Operating
 * System."
 *
 * The POS page's comparison grid, on the shared comparison tables under
 * ('pos', 'alternatives') - no tables of its own, because comparison_sections
 * is keyed by page and section and this is the third grid to use it.
 *
 * Rated cells, not prose: eleven rows of stars over one closing row of words
 * as many words, which is the opposite editorial choice from the SFA-DMS grid.
 * That is what the section's TEXT cellType selects.
 *
 * The eyebrow, heading and subtext above the grid live once in
 * page_section_copy under ('pos', 'alternatives').
 */

/** One cell as this grid stores it: a sentence against a column. */
/**
 * One cell of a row.
 *
 * Exactly one of content and rating is set - the shared table enforces
 * that with num_nonnulls(content, rating) = 1 - so a scored row and the
 * written cost row live in the same shape without either carrying a field it
 * has no use for.
 */
export interface PosAlternativeCell {
  columnId: string;
  content: string | null;
  rating: number | null;
}

/** A row with its cells attached, in the shape the screens edit. */
export interface ResolvedPosAlternativeRow extends ComparisonRow {
  cells: PosAlternativeCell[];
}

export interface CreatePosAlternativeRowInput {
  /** The leader cell - the criterion this row compares on. */
  parameter: string;
  /**
   * STANDARD rows are scored out of five; a SUMMARY row closes the grid in
   * words. Omitted means STANDARD, which is what almost every row is.
   */
  rowType?: 'STANDARD' | 'SUMMARY';
  displayOrder?: number;
  status: ContentStatus;
  /**
   * Replaces the row's cells wholesale - a column left out is cleared, which
   * is how a cell is emptied. A row is only ever edited as a whole line.
   */
  cells: PosAlternativeCell[];
}

export interface UpdatePosAlternativeRowInput {
  parameter?: string;
  displayOrder?: number;
  status?: ContentStatus;
  /** Absent leaves the cells alone; present replaces every one of them. */
  cells?: PosAlternativeCell[];
}

export interface UpsertPosAlternativesSectionInput {
  /** The leader column's header - "Criteria" on this grid. */
  leaderLabel: string;
  leaderDescription: string | null;
}

export interface CreatePosAlternativesColumnInput {
  name: string;
  /** Exactly one column is ours; setting it clears the rest. */
  highlightColumn: boolean;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosAlternativesColumnInput = Partial<CreatePosAlternativesColumnInput>;

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
export interface PublicPosAlternativesSection {
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
    /**
     * Keyed by column id, so the site pairs a cell to its header without
     * knowing the order. A cell holds a rating or a string, never both - the
     * capability rows are scored and the closing cost row is written.
     */
    cells: Record<string, { content: string | null; rating: number | null }>;
    /** STANDARD rows are scored; a SUMMARY row closes the grid in words. */
    rowType: string;
  }>;
}

/** Narrowed from the shared value row, which also carries ratings and tones. */
export type PosAlternativeValue = ComparisonValue;
