// src/modules/product-pages/hreasy-page/types/alternatives-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { ComparisonRow } from '../../shared/comparison/comparison.types';

/**
 * "A Great HR App for Your Office Isn't the Same as an HR System for Your
 * Whole Business."
 *
 * The HREasy page's comparison grid, on the shared comparison tables under
 * ('hreasy', 'alternatives') - no tables of its own, because
 * comparison_sections is keyed by page and section and this is the fourth
 * grid to use it.
 *
 * Ticks and crosses, not prose and not stars: "No star ratings", as the
 * section's own subtext puts it - just the rows where the two columns
 * actually differ. That is what the section's BOOLEAN cellType selects.
 *
 * The eyebrow, heading and subtext above the grid live once in
 * page_section_copy under ('hreasy', 'alternatives').
 */

/**
 * One cell of a row: a yes or a no against a column.
 *
 * `false` is a real answer rather than an absence - it is the cross, which is
 * the point of the rows where the two columns differ. A column with nothing
 * to say is left out of the list entirely.
 */
export interface HreasyAlternativeCell {
  columnId: string;
  flag: boolean;
}

/** A row with its cells attached, in the shape the screens edit. */
export interface ResolvedHreasyAlternativeRow extends ComparisonRow {
  cells: HreasyAlternativeCell[];
}

export interface CreateHreasyAlternativeRowInput {
  /** The leader cell - what the row compares on. */
  parameter: string;
  displayOrder?: number;
  status: ContentStatus;
  /**
   * Replaces the row's cells wholesale - a column left out is cleared, which
   * is how a cell is emptied. A row is only ever edited as a whole line.
   */
  cells: HreasyAlternativeCell[];
}

export interface UpdateHreasyAlternativeRowInput {
  parameter?: string;
  displayOrder?: number;
  status?: ContentStatus;
  /** Absent leaves the cells alone; present replaces every one of them. */
  cells?: HreasyAlternativeCell[];
}

export interface UpsertHreasyAlternativesSectionInput {
  /** The leader column's header - "What your workforce needs" on this grid. */
  leaderLabel: string;
  leaderDescription: string | null;
}

export interface CreateHreasyAlternativesColumnInput {
  name: string;
  /**
   * The small line under the name - "Keka, greytHR" names the products the
   * column stands for without putting a competitor's logo on the page.
   */
  description: string | null;
  /** Exactly one column is ours; setting it clears the rest. */
  highlightColumn: boolean;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyAlternativesColumnInput =
  Partial<CreateHreasyAlternativesColumnInput>;

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
export interface PublicHreasyAlternativesSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  /** The leader column's header. */
  leaderLabel: string;
  columns: Array<{
    id: string;
    name: string;
    description: string | null;
    highlight: boolean;
  }>;
  rows: Array<{
    parameter: string;
    /**
     * Keyed by column id, so the site pairs a cell to its header without
     * knowing the order. `true` draws a tick, `false` a cross, and a column
     * with nothing to say is simply absent.
     */
    cells: Record<string, boolean>;
  }>;
}
