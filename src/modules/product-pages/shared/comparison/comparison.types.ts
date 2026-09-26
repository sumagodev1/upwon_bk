// src/modules/product-pages/shared/comparison/comparison.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * A comparison grid.
 *
 * Shared rather than a page's own: comparison_sections is keyed by
 * (page_key, section_key), so one set of tables holds every page's grid. The
 * ERP page's "UPWON vs the alternatives" and the SFA-DMS page's are the same
 * five records drawn two ways - prose cells there, star ratings here - which
 * is what cellType selects between.
 *
 * Five records rather than one row-per-line, so the columns are content too: an
 * administrator adding "Microsoft Dynamics" adds a column and fills in one cell
 * per row, and the site draws it without knowing the name.
 *
 * The leader column ("How They Compare") is not one of the columns - it carries
 * the row's parameter rather than a value, and is wider - so it lives on the
 * section as two fields.
 *
 * The eyebrow, heading and description above the grid live once in
 * page_section_copy under ('erp', 'alternatives').
 */

/** Which side of the comparison a column is. Editorial; styling follows highlight. */
export type ComparisonColumnType = 'OURS' | 'COMPETITOR';

export const COMPARISON_COLUMN_TYPES: readonly ComparisonColumnType[] = [
  'OURS',
  'COMPETITOR',
] as const;

/**
 * How a section's cells are authored and drawn.
 *
 * TEXT: each cell is a sentence, as the ERP grid has them.
 * RATING: each cell is a score out of five, as the SFA-DMS grid has them -
 * with zero meaning the dash the grid draws for "not available natively",
 * which is a different claim from one star.
 * BOOLEAN: each cell is a yes or a no, drawn as a tick or a cross, as the
 * HREasy grid has them.
 */
export type ComparisonCellType = 'TEXT' | 'RATING' | 'BOOLEAN';

export const COMPARISON_CELL_TYPES: readonly ComparisonCellType[] = [
  'TEXT',
  'RATING',
  'BOOLEAN',
];

/**
 * A row's shape.
 *
 * SUMMARY is the table's closing line - a cost of ownership, say - whose cells
 * are short coloured badges whatever the section's cell type is. A row shape
 * rather than a second table, because it sits in the same grid and moves with
 * the same columns.
 */
export type ComparisonRowType = 'STANDARD' | 'SUMMARY';

export const COMPARISON_ROW_TYPES: readonly ComparisonRowType[] = ['STANDARD', 'SUMMARY'];

/**
 * The tone a summary badge is drawn in.
 *
 * Named rather than a colour: the three are the site's own palette, and an
 * authored hex here would let somebody pick something outside it.
 */
export type ComparisonTone = 'BEST' | 'GOOD' | 'NEUTRAL';

export const COMPARISON_TONES: readonly ComparisonTone[] = ['BEST', 'GOOD', 'NEUTRAL'];

export interface ComparisonSection {
  id: string;
  pageKey: string;
  sectionKey: string;
  cellType: ComparisonCellType;
  leaderLabel: string;
  leaderDescription: string | null;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComparisonColumn {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  /** Optional wordmark. Exclusive with logoFileId. */
  logoUrl: string | null;
  logoFileId: string | null;
  logoAlt: string | null;
  columnType: ComparisonColumnType;
  highlightColumn: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A column with its logo resolved to something the browser can load. */
export interface ResolvedComparisonColumn extends ComparisonColumn {
  logo: string | null;
}

export interface ComparisonCategory {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One cell: prose, a score, or a yes/no - never more than one.
 *
 * The database enforces the exclusivity; these stay separately nullable rather
 * than a union so a caller can read `content`, `rating` or `flag` without
 * narrowing on a discriminator the row does not carry.
 */
export interface ComparisonValue {
  id: string;
  rowId: string;
  columnId: string;
  content: string | null;
  /** 0-5, where 0 is the dash. Null outside a RATING section. */
  rating: number | null;
  /**
   * The tick or the cross. Null outside a BOOLEAN section.
   *
   * `false` is a real answer rather than an absence - it is the cross, which
   * is the point of the rows where two columns differ - so a caller must test
   * for null rather than falsiness.
   */
  flag: boolean | null;
  /** Only set on a summary row's cells. */
  tone: ComparisonTone | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComparisonRow {
  id: string;
  categoryId: string;
  rowType: ComparisonRowType;
  parameter: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A row with its cells attached, keyed by column. */
export interface ResolvedComparisonRow extends ComparisonRow {
  values: ComparisonValue[];
}

export interface UpsertComparisonSectionInput {
  leaderLabel: string;
  leaderDescription: string | null;
  /**
   * Omitted leaves whatever the section already has, and defaults to TEXT on a
   * first save. It is not an ordinary editable field: changing it would make
   * every stored cell the wrong shape at once, so no screen offers it and the
   * value comes from the module that owns the section.
   */
  cellType?: ComparisonCellType;
}

export interface CreateComparisonColumnInput {
  name: string;
  description: string | null;
  logoUrl: string | null;
  logoFileId: string | null;
  logoAlt: string | null;
  columnType: ComparisonColumnType;
  highlightColumn: boolean;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateComparisonColumnInput = Partial<CreateComparisonColumnInput>;

export interface CreateComparisonCategoryInput {
  name: string;
  description: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateComparisonCategoryInput = Partial<CreateComparisonCategoryInput>;

/**
 * A row and its cells in one write.
 *
 * Cells are not addressed on their own: a row without them is a blank line in
 * the grid, and an administrator filling one in is filling in the whole line.
 * `values` replaces the row's cells wholesale - a column left out is cleared,
 * which is how a cell is emptied.
 */
/** One cell as a form submits it: prose, a score, a yes/no, or a summary badge. */
export interface ComparisonCellInput {
  columnId: string;
  content?: string | null;
  rating?: number | null;
  flag?: boolean | null;
  tone?: ComparisonTone | null;
}

export interface CreateComparisonRowInput {
  parameter: string;
  /** Omitted means STANDARD - the ordinary row every grid is made of. */
  rowType?: ComparisonRowType;
  displayOrder?: number;
  status: ContentStatus;
  values: ComparisonCellInput[];
}

export interface UpdateComparisonRowInput {
  parameter?: string;
  displayOrder?: number;
  status?: ContentStatus;
  values?: Array<{ columnId: string; content: string }>;
}

export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The whole grid in one read. Cells arrive keyed by column id rather than by
 * name, so the site matches them up without knowing what any column is called.
 */
export interface PublicComparisonSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  leader: { label: string; description: string | null };
  columns: Array<{
    id: string;
    name: string;
    description: string | null;
    logo: string | null;
    logoAlt: string | null;
    columnType: ComparisonColumnType;
    highlight: boolean;
  }>;
  categories: Array<{
    name: string;
    description: string | null;
    rows: Array<{
      parameter: string;
      /** Keyed by column id. A column with nothing to say is simply absent. */
      values: Record<string, string>;
    }>;
  }>;
}
