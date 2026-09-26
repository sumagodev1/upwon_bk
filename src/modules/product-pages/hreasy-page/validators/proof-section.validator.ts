// src/modules/product-pages/hreasy-page/validators/proof-section.validator.ts

import { CONTENT_STATUSES, ContentStatus, LIMITS } from '../../../../config/constants';
import { PaginationParams } from '../../../../core/types/common.types';
import { parsePagination } from '../../../../core/utils/pagination';
import { validator, Validator } from '../../../../core/utils/validation';
import { validateMediaUrl } from '../utils/link';
import {
  CreateHreasyProofCellInput,
  CreateHreasyProofTileInput,
  HREASY_PROOF_CELL_SHAPES,
  HREASY_PROOF_CELL_WIDTHS,
  HREASY_PROOF_TILE_KINDS,
  HreasyProofCellFilters,
  HreasyProofCellShape,
  HreasyProofCellWidth,
  HreasyProofTileFilters,
  HreasyProofTileKind,
  ReorderInput,
  TILES_PER_SHAPE,
  UpdateHreasyProofCellInput,
} from '../types/proof-section.types';

/** Matched against the source text, so the limits are authoring limits. */
const IMAGE_URL_MAX = 1000;
const NAME_MAX = 160;
const VALUE_MAX = 40;
const LABEL_MAX = 160;
const CLIENT_MAX = 160;
const HEADLINE_MAX = 200;
const LINE_MAX = 400;

// ── the tiles ─────────────────────────────────────────────────────────────

/**
 * Reads one tile.
 *
 * A tile is exactly one of three kinds, and each kind carries exactly its own
 * fields - so this reads the kind first and then only what that kind uses,
 * leaving the rest null. That is what the table's per-kind CHECKs enforce, and
 * doing it here means the error names the missing field rather than the
 * constraint.
 *
 * Create and update take the same shape: a tile is small enough that a whole
 * replacement is clearer than a patch, and switching a LOGO to a STAT has to
 * clear the picture anyway.
 */
export function validateHreasyProofTile(body: unknown): CreateHreasyProofTileInput {
  const v = validator(body);
  const kind = v.requiredEnum('kind', HREASY_PROOF_TILE_KINDS) as HreasyProofTileKind;

  /*
   * Read before the per-kind fields, because it applies to all three and an
   * absent status means ACTIVE - a card authored without saying is on.
   */
  const status = v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE';

  const blank: Omit<CreateHreasyProofTileInput, 'kind'> = {
    status,
    name: null,
    imageUrl: null,
    imageFileId: null,
    value: null,
    label: null,
    client: null,
    headline: null,
    line: null,
  };

  if (kind === 'LOGO') {
    const imageUrl = v.optionalString('imageUrl', { max: IMAGE_URL_MAX }) ?? null;
    if (imageUrl) validateMediaUrl(v, 'imageUrl', imageUrl);
    const imageFileId = v.optionalUuid('imageFileId') ?? null;

    v.custom(
      imageUrl === null || imageFileId === null,
      'imageUrl',
      'Provide either imageUrl or imageFileId, not both',
      'CONFLICTING_IMAGE_SOURCE',
    );
    // A logo card exists only to show a mark, so one with neither is an empty
    // white rectangle in the middle of the bento.
    v.custom(
      imageUrl !== null || imageFileId !== null,
      'imageUrl',
      'A logo needs an image: give either imageUrl or imageFileId',
      'REQUIRED',
    );

    const dto: CreateHreasyProofTileInput = {
      ...blank,
      kind,
      name: v.requiredString('name', { min: 1, max: NAME_MAX }),
      imageUrl,
      imageFileId,
    };
    v.assert();
    return dto;
  }

  if (kind === 'STAT') {
    const dto: CreateHreasyProofTileInput = {
      ...blank,
      kind,
      /*
       * A minimum of one, not two: "8" is a perfectly good figure, and the
       * card renders it verbatim - the suffix carries as much meaning as the
       * digits.
       */
      value: v.requiredString('value', { min: 1, max: VALUE_MAX }),
      label: v.requiredString('label', { min: 2, max: LABEL_MAX }),
      /*
       * Required, and this is the point of the section: its own heading says
       * the proof is named rather than an aggregate, so a figure with nobody
       * attached is exactly the claim the page says it is not making.
       */
      client: v.requiredString('client', { min: 2, max: CLIENT_MAX }),
    };
    v.assert();
    return dto;
  }

  const dto: CreateHreasyProofTileInput = {
    ...blank,
    kind,
    client: v.requiredString('client', { min: 2, max: CLIENT_MAX }),
    headline: v.requiredString('headline', { min: 2, max: HEADLINE_MAX }),
    line: v.requiredString('line', { min: 2, max: LINE_MAX }),
  };
  v.assert();
  return dto;
}

export function validateHreasyProofTileListQuery(query: Record<string, unknown>): {
  filters: HreasyProofTileFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: HreasyProofTileFilters = {
    kind: v.optionalEnum('kind', HREASY_PROOF_TILE_KINDS) as HreasyProofTileKind | undefined,
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── the cells ─────────────────────────────────────────────────────────────

/**
 * Reads the three tile slots against the shape.
 *
 * The shape says how many cards the column draws, so it also says which slots
 * must be filled: a spare tile nobody renders is a quiet inconsistency, and a
 * missing one is a half-empty column.
 */
function readSlots(
  v: Validator,
  shape: HreasyProofCellShape,
  required: boolean,
): { tileAId: string | null; tileBId: string | null; tileCId: string | null } {
  const tileAId = required
    ? v.requiredUuid('tileAId')
    : (v.optionalUuid('tileAId') ?? null);
  const tileBId = v.optionalUuid('tileBId') ?? null;
  const tileCId = v.optionalUuid('tileCId') ?? null;

  const filled = [tileAId, tileBId, tileCId].filter((id) => id !== null).length;
  const wanted = TILES_PER_SHAPE[shape];

  v.custom(
    filled === wanted,
    'tileBId',
    `A ${shape} cell draws ${wanted} card${wanted === 1 ? '' : 's'}; ${filled} given`,
    'SLOT_COUNT_MISMATCH',
  );

  // The slots fill in order, so a gap would leave the renderer guessing.
  v.custom(
    !(tileCId !== null && tileBId === null),
    'tileBId',
    'Fill the second slot before the third',
    'SLOT_GAP',
  );

  return { tileAId, tileBId, tileCId };
}

export function validateCreateHreasyProofCell(body: unknown): CreateHreasyProofCellInput {
  const v = validator(body);
  const shape = v.requiredEnum('shape', HREASY_PROOF_CELL_SHAPES) as HreasyProofCellShape;
  const slots = readSlots(v, shape, true);

  const dto: CreateHreasyProofCellInput = {
    width: v.requiredEnum('width', HREASY_PROOF_CELL_WIDTHS) as HreasyProofCellWidth,
    shape,
    tileAId: slots.tileAId as string,
    tileBId: slots.tileBId,
    tileCId: slots.tileCId,
    // Left undefined on purpose when absent - the service appends to the end.
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES) ?? 'ACTIVE',
  };

  v.assert();
  return dto;
}

/**
 * Reads an update.
 *
 * The shape and its slots move together: changing a STACK to a TALL means
 * dropping a card, so an update that touches either has to restate both. An
 * update that touches neither leaves the arrangement alone.
 */
export function validateUpdateHreasyProofCell(body: unknown): UpdateHreasyProofCellInput {
  const v = validator(body);
  v.requireAtLeastOne(['width', 'shape', 'tileAId', 'displayOrder', 'status']);

  const touchesLayout = v.has('shape') || v.has('tileAId') || v.has('tileBId') || v.has('tileCId');

  const dto: UpdateHreasyProofCellInput = {
    width: v.optionalEnum('width', HREASY_PROOF_CELL_WIDTHS) as
      | HreasyProofCellWidth
      | undefined,
    displayOrder: v.optionalNumber('displayOrder', { min: 0, max: 9999, integer: true }),
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };

  if (touchesLayout) {
    const shape = v.requiredEnum('shape', HREASY_PROOF_CELL_SHAPES) as HreasyProofCellShape;
    const slots = readSlots(v, shape, true);
    dto.shape = shape;
    dto.tileAId = slots.tileAId as string;
    dto.tileBId = slots.tileBId;
    dto.tileCId = slots.tileCId;
  }

  v.assert();
  return dto;
}

export function validateHreasyProofCellListQuery(query: Record<string, unknown>): {
  filters: HreasyProofCellFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: HreasyProofCellFilters = {
    status: v.optionalEnum('status', CONTENT_STATUSES),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

// ── shared ────────────────────────────────────────────────────────────────

export function validateHreasyProofStatusBody(body: unknown): { status: ContentStatus } {
  const v = validator(body);
  const status = v.requiredEnum('status', CONTENT_STATUSES);
  v.assert();
  return { status };
}

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export function validateHreasyProofCellReorder(body: unknown): ReorderInput {
  const v = validator(body);
  const ids = v.uuidArray('ids', { max: LIMITS.MAX_HREASY_PROOF_CELLS });

  v.custom(ids.length > 0, 'ids', 'ids must contain at least one id', 'REQUIRED');

  // uuidArray dedupes silently, which would turn a duplicated id into a
  // partial reorder. Compare against the raw length to catch it.
  const raw = (body as { ids?: unknown } | null)?.ids;
  v.custom(
    !Array.isArray(raw) || raw.length === ids.length,
    'ids',
    'ids must not contain duplicates',
    'DUPLICATE_IDS',
  );

  v.assert();
  return { ids };
}
