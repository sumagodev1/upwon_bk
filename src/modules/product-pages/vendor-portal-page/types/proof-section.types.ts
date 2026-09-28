// src/modules/product-pages/vendor-portal-page/types/proof-section.types.ts

import { ContentStatus } from '../../../../config/constants';
import { HeadingLine } from '../../../home-page/utils/heading-markup';
import { VmsIconName } from '../utils/icons';

/**
 * The proof strip - "Not a Pitch. Just What's Already Under Control."
 *
 * A twelve-column bento, not the uniform row the WMS page carries. Five tiles
 * today in two rows: a metric card beside a wide picture, then a picture and
 * two narrower metric cards.
 *
 * One shape with two kinds rather than two shapes: they are one thing to an
 * editor - a tile in the bento - and they share an ordering, which is what
 * decides the layout.
 *
 * The eyebrow, heading and subtext live once in page_section_copy under
 * ('vms', 'proof').
 */

export type VmsProofTileKind = 'METRIC' | 'IMAGE';

export const VMS_PROOF_TILE_KINDS = ['METRIC', 'IMAGE'] as const;

/**
 * Which way the arrow beside a figure points.
 *
 * The direction of the change, not of the benefit: "32% processing time" is
 * an improvement drawn with a down arrow.
 */
export type VmsProofDirection = 'up' | 'down';

export const VMS_PROOF_DIRECTIONS = ['up', 'down'] as const;

export interface VmsProofTile {
  id: string;
  kind: VmsProofTileKind;
  /** How many of the twelve columns this tile takes on a desktop grid. */
  colSpan: number;

  // METRIC only. Null on an IMAGE tile, enforced by CHECK.
  icon: VmsIconName | null;
  value: string | null;
  direction: VmsProofDirection | null;
  title: string | null;
  description: string | null;

  // IMAGE only. Null on a METRIC tile, enforced by CHECK.
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;

  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A tile with its two image sources collapsed into the one URL to render. */
export interface ResolvedVmsProofTile extends VmsProofTile {
  image: string | null;
}

/**
 * Creating a tile.
 *
 * One input for both kinds rather than a discriminated union: the validator
 * reads `kind` first and then requires exactly that kind's fields, so the
 * per-kind rule lives in one place instead of being split between the type
 * and the check.
 */
export interface CreateVmsProofTileInput {
  kind: VmsProofTileKind;
  colSpan: number;
  icon: VmsIconName | null;
  value: string | null;
  direction: VmsProofDirection | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  /** Omitted means "append to the end" - resolved by the service. */
  displayOrder?: number;
  status: ContentStatus;
}

/**
 * Updating one.
 *
 * `kind` is absent on purpose: changing a tile from a metric into a picture
 * would mean clearing five fields and requiring three others in the same
 * request, and the result is a different tile in every way but its id.
 * Delete it and add the other kind instead.
 */
export type UpdateVmsProofTileInput = Partial<Omit<CreateVmsProofTileInput, 'kind'>>;

export interface VmsProofTileFilters {
  status?: ContentStatus;
  kind?: VmsProofTileKind;
}

/** Reorder takes the complete id list, so it is idempotent. */
export interface ReorderInput {
  ids: string[];
}

/**
 * The website-facing shape.
 *
 * The tiles arrive in one list in their layout order, each carrying its own
 * kind and span - which is what the bento needs to lay itself out.
 */
export interface PublicVmsProofSection {
  eyebrow: string | null;
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  tiles: Array<
    | {
        kind: 'METRIC';
        colSpan: number;
        icon: string;
        value: string;
        direction: VmsProofDirection;
        title: string;
        description: string;
      }
    | {
        kind: 'IMAGE';
        colSpan: number;
        image: string;
        imageAlt: string | null;
      }
  >;
}
