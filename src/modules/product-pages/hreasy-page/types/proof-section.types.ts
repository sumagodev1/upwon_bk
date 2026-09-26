// src/modules/product-pages/hreasy-page/types/proof-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';

/**
 * "UpWon HRMS - Just What's Already Running."
 *
 * A continuously-scrolling bento of mixed-size cards, not the logo wall the
 * other product pages carry.
 *
 * Two shapes, because they are two different edits: the tiles are the content
 * an editor rewrites, and the cells are the arrangement they are laid out in.
 *
 * The eyebrow, heading and subtext above the bento live once in
 * page_section_copy under ('hreasy', 'proof').
 */

// ── the tiles ─────────────────────────────────────────────────────────────

/** A client logo, a figure, or a named proof. Each draws different fields. */
export type HreasyProofTileKind = 'LOGO' | 'STAT' | 'PROOF';

export const HREASY_PROOF_TILE_KINDS: readonly HreasyProofTileKind[] = [
  'LOGO',
  'STAT',
  'PROOF',
] as const;

export interface HreasyProofTile {
  id: string;
  kind: HreasyProofTileKind;

  /** LOGO: the mark, and the name read in its place. */
  name: string | null;
  imageUrl: string | null;
  imageFileId: string | null;

  /** STAT: the figure and what it counts. */
  value: string | null;
  label: string | null;

  /** STAT and PROOF both name the customer, in the same orange caps. */
  client: string | null;

  /** PROOF: the headline number and the line under it. */
  headline: string | null;
  line: string | null;

  /**
   * Whether the card may be drawn at all.
   *
   * A card has no order of its own - the column decides where it sits - but
   * it does have its own on/off, because pulling a client from the site is
   * one decision about that client rather than an edit to every column
   * drawing them. Switching a card off drops every column that places it,
   * the same way a card missing its image does.
   */
  status: ContentStatus;

  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The tile with its image pair collapsed into the one URL to render. */
export interface ResolvedHreasyProofTile extends HreasyProofTile {
  image: string | null;
}

export interface CreateHreasyProofTileInput {
  kind: HreasyProofTileKind;
  name: string | null;
  imageUrl: string | null;
  imageFileId: string | null;
  value: string | null;
  label: string | null;
  client: string | null;
  headline: string | null;
  line: string | null;
  status: ContentStatus;
}

export type UpdateHreasyProofTileInput = CreateHreasyProofTileInput;

export interface HreasyProofTileFilters {
  kind?: HreasyProofTileKind;
  status?: ContentStatus;
}

// ── the cells ─────────────────────────────────────────────────────────────

/**
 * How wide a column of the bento is.
 *
 * An enum rather than a number because the site draws these with Tailwind
 * classes, which have to exist in the source at build time - a width from the
 * database would name a class nobody generated.
 */
export type HreasyProofCellWidth = 'NARROW' | 'SMALL' | 'MEDIUM' | 'WIDE';

export const HREASY_PROOF_CELL_WIDTHS: readonly HreasyProofCellWidth[] = [
  'NARROW',
  'SMALL',
  'MEDIUM',
  'WIDE',
] as const;

/**
 * How a column is divided.
 *
 *   TALL      one card filling the column
 *   STACK     two cards, one above the other
 *   WIDE_TOP  a wide card over two half-width cards
 */
export type HreasyProofCellShape = 'TALL' | 'STACK' | 'WIDE_TOP';

export const HREASY_PROOF_CELL_SHAPES: readonly HreasyProofCellShape[] = [
  'TALL',
  'STACK',
  'WIDE_TOP',
] as const;

/** How many tiles each shape draws - the rule the table's CHECK enforces. */
export const TILES_PER_SHAPE: Readonly<Record<HreasyProofCellShape, number>> = {
  TALL: 1,
  STACK: 2,
  WIDE_TOP: 3,
};

export interface HreasyProofCell {
  id: string;
  width: HreasyProofCellWidth;
  shape: HreasyProofCellShape;
  tileAId: string;
  tileBId: string | null;
  tileCId: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The cell with its tiles attached, in the shape the screens edit. */
export interface ResolvedHreasyProofCell extends HreasyProofCell {
  tiles: ResolvedHreasyProofTile[];
}

export interface CreateHreasyProofCellInput {
  width: HreasyProofCellWidth;
  shape: HreasyProofCellShape;
  tileAId: string;
  tileBId: string | null;
  tileCId: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyProofCellInput = Partial<CreateHreasyProofCellInput>;

export interface HreasyProofCellFilters {
  status?: ContentStatus;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

// ── the website-facing shape ──────────────────────────────────────────────

/** One card, flattened to exactly what its kind draws. */
export type PublicHreasyProofTile =
  | { kind: 'LOGO'; name: string; image: string }
  | { kind: 'STAT'; value: string; label: string; client: string }
  | { kind: 'PROOF'; client: string; headline: string; line: string };

/**
 * The whole bento in one read.
 *
 * Null when the copy is missing or no cell is published - the page then keeps
 * the strip it ships, which is a complete working one.
 *
 * A cell whose tiles cannot all be drawn is dropped rather than published
 * with a hole: the shapes are fixed, and a STACK missing its second card
 * would render a half-empty column. An inactive card counts as one that
 * cannot be drawn.
 */
export interface PublicHreasyProofSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  cells: Array<{
    width: HreasyProofCellWidth;
    shape: HreasyProofCellShape;
    tiles: PublicHreasyProofTile[];
  }>;
}
