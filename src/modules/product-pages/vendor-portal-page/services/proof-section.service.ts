// src/modules/product-pages/vendor-portal-page/services/proof-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import {
  assertUsableImageFile,
  resolveImageSource,
} from '../../../home-page/utils/image-asset';
import * as repo from '../repositories/proof-section.repository';
import {
  CreateVmsProofTileInput,
  PublicVmsProofSection,
  ResolvedVmsProofTile,
  UpdateVmsProofTileInput,
  VmsProofTile,
  VmsProofTileFilters,
} from '../types/proof-section.types';

const MODULE = 'vendor_portal_page';
const ENTITY = 'vms_proof_tile';

/** A picture tile covers its box, and the shipped pair are both about 2:1. */
const IMAGE_SLOT = 'vmsProofImage' as const;

const toResolved = async (tile: VmsProofTile): Promise<ResolvedVmsProofTile> => ({
  ...tile,
  image: await resolveImageSource(tile.imageUrl, tile.imageFileId),
});

const toResolvedMany = (tiles: VmsProofTile[]): Promise<ResolvedVmsProofTile[]> =>
  Promise.all(tiles.map(toResolved));

/**
 * Rejects a patch that does not belong to the tile's kind.
 *
 * The validator cannot do this: which fields are legal depends on the stored
 * kind, and that is not known until the row is read. Without it a picture
 * tile could be handed a figure - the database would refuse it, but with a
 * constraint name rather than a message an editor can act on.
 */
const assertPatchMatchesKind = (tile: VmsProofTile, patch: UpdateVmsProofTileInput): void => {
  const metricFields = ['icon', 'value', 'direction', 'title', 'description'] as const;
  const imageFields = ['imageUrl', 'imageFileId', 'imageAlt'] as const;

  const named = (fields: readonly string[]): string[] =>
    fields.filter((field) => (patch as Record<string, unknown>)[field] !== undefined);

  const wrong = tile.kind === 'METRIC' ? named(imageFields) : named(metricFields);
  if (wrong.length === 0) return;

  const what = tile.kind === 'METRIC' ? 'a metric tile' : 'a picture tile';
  throw new ValidationError(`Those fields do not belong to ${what}`, [
    {
      field: wrong[0],
      message: `${wrong.join(', ')} cannot be set on ${what}. Delete it and add the other kind instead.`,
      code: 'WRONG_TILE_KIND',
    },
  ]);
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: VmsProofTileFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedVmsProofTile[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedVmsProofTile> => {
  const tile = await repo.findById(id);
  if (!tile) throw new NotFoundError('Proof tile');
  return toResolved(tile);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateVmsProofTileInput,
  context: RequestContext,
): Promise<ResolvedVmsProofTile> => {
  /*
   * Checked before the transaction opens: the dimension check reads the blob
   * back out of storage, and a round trip to storage does not belong inside
   * an open transaction.
   */
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, IMAGE_SLOT, 'imageFileId');
  }

  const tile = await withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_VMS_PROOF_TILES) {
      throw new ConflictError(
        `The strip holds at most ${LIMITS.MAX_VMS_PROOF_TILES} tiles. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_PROOF_TILE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { kind: created.kind, title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(tile);
};

export const update = async (
  id: string,
  patch: UpdateVmsProofTileInput,
  context: RequestContext,
): Promise<ResolvedVmsProofTile> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, IMAGE_SLOT, 'imageFileId');
  }

  const tile = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Proof tile');

    assertPatchMatchesKind(existing, patch);

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Proof tile');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_PROOF_TILE_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { title: existing.title, status: existing.status },
        newValues: { title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(tile);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedVmsProofTile> => update(id, { status }, context);

export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedVmsProofTile[]> => {
  const tiles = await withTransaction(async (client) => {
    const total = await repo.count(client);

    const existing = await repo.findExistingIds(ids, client);
    const unknown = ids.filter((id) => !existing.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('The order names a tile that does not exist', [
        {
          field: 'ids',
          message: `Unknown tile ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_VMS_PROOF_TILE',
        },
      ]);
    }

    if (ids.length !== total) {
      throw new ValidationError('The order must list every tile', [
        {
          field: 'ids',
          message: `Expected all ${total} tile ids, received ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_PROOF_TILES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    // Read on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_VMS_PROOF_TILES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

  return toResolvedMany(tiles);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Proof tile');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VMS_PROOF_TILE_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { kind: existing.kind, title: existing.title },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy above the bento and the tiles in it.
 *
 * Null when the copy is missing or no tile is drawable - the page then keeps
 * the strip it ships, which is a complete working one.
 *
 * A picture tile whose file has been purged is dropped rather than drawn as
 * an empty box; the metric tiles around it still stand, because the bento
 * reflows to whatever it is given.
 */
export const getPublished = async (): Promise<PublicVmsProofSection | null> => {
  const [copy, tiles] = await Promise.all([
    sectionCopyService.get('vms', 'proof'),
    repo.findPublished(),
  ]);
  if (!copy || tiles.length === 0) return null;

  const resolved = await toResolvedMany(tiles);

  const drawable: PublicVmsProofSection['tiles'] = [];
  for (const tile of resolved) {
    if (tile.kind === 'METRIC') {
      // The CHECK guarantees these are all set on a METRIC row; the casts say
      // so to TypeScript, which only sees the nullable column types.
      drawable.push({
        kind: 'METRIC',
        colSpan: tile.colSpan,
        icon: tile.icon as string,
        value: tile.value as string,
        direction: tile.direction!,
        title: tile.title as string,
        description: tile.description as string,
      });
    } else if (tile.image) {
      drawable.push({
        kind: 'IMAGE',
        colSpan: tile.colSpan,
        image: tile.image,
        imageAlt: tile.imageAlt,
      });
    }
  }
  if (drawable.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    tiles: drawable,
  };
};
