// src/modules/why-upwon-page/services/proof-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { env } from '../../../config/env';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import { getStorageProvider } from '../../../storage/storage.factory';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../files/repositories/file.repository';
import * as sectionCopyService from '../../home-page/services/section-copy.service';
import { checkImageDimensions } from '../../home-page/utils/image-spec';
import { readImageDimensions } from '../../home-page/utils/image-dimensions';
import * as repo from '../repositories/proof-section.repository';
import {
  CreateWhyUpwonProofCalloutInput,
  PublicWhyUpwonProofSection,
  ResolvedWhyUpwonProofPanel,
  WhyUpwonProofPanel,
  WhyUpwonProofCallout,
  WhyUpwonProofCalloutFilters,
  UpdateWhyUpwonProofCalloutInput,
  UpsertWhyUpwonProofPanelInput,
} from '../types/proof-section.types';

const MODULE = 'why_upwon_page';
const ENTITY = 'why_upwon_proof_callout';
const PANEL_ENTITY = 'why_upwon_proof_panel';

/** Only images belong in the artwork's place; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

// ── the artwork panel ─────────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the site keeps its own artwork rather than
  // the request failing for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedPanel = async (
  panel: WhyUpwonProofPanel,
): Promise<ResolvedWhyUpwonProofPanel> => ({
  ...panel,
  image: await resolveSource(panel.imageUrl, panel.imageFileId),
});

/** Rejects a file id that is not a live image of the right shape. */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const field = 'imageFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Artwork must be an image', [
      { field, message: `Expected an image, got ${file.mimeType}`, code: 'INVALID_FILE_TYPE' },
    ]);
  }

  const buffer = await getStorageProvider().getFile(file.storageKey);
  const dimensions = readImageDimensions(buffer);
  if (!dimensions) {
    throw new ValidationError('Image could not be read', [
      {
        field,
        message: `${file.originalName} is not a readable PNG, JPEG, GIF or WebP image`,
        code: 'UNREADABLE_IMAGE',
      },
    ]);
  }

  const problem = checkImageDimensions('whyUpwonProofArtwork', dimensions);
  if (problem) {
    throw new ValidationError('Artwork is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<ResolvedWhyUpwonProofPanel | null> => {
  const panel = await repo.findPanel();
  return panel ? toResolvedPanel(panel) : null;
};

export const upsertPanel = async (
  input: UpsertWhyUpwonProofPanelInput,
  context: RequestContext,
): Promise<ResolvedWhyUpwonProofPanel> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_PROOF_PANEL_UPDATED,
        module: MODULE,
        entityType: PANEL_ENTITY,
        entityId: saved.id,
        oldValues: existing
          ? { image: existing.imageUrl ?? existing.imageFileId, imageAlt: existing.imageAlt }
          : undefined,
        newValues: { image: saved.imageUrl ?? saved.imageFileId, imageAlt: saved.imageAlt },
      },
      context,
      client,
    );

    return toResolvedPanel(saved);
  });
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: WhyUpwonProofCalloutFilters,
  pagination: PaginationParams,
): Promise<{ rows: WhyUpwonProofCallout[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<WhyUpwonProofCallout> => {
  const callout = await repo.findById(id);
  if (!callout) throw new NotFoundError('Callout');
  return callout;
};

/**
 * The website-facing read: the copy and every active callout, in order.
 *
 * Null when the copy is missing or nothing is active - the site treats that as
 * "keep the built-in section", the same as an unreachable API.
 */
export const getPublished = async (): Promise<PublicWhyUpwonProofSection | null> => {
  const [copy, panel, callouts] = await Promise.all([
    sectionCopyService.get('why-upwon', 'proof'),
    repo.findPanel(),
    repo.findPublished(),
  ]);
  if (!copy || callouts.length === 0) return null;

  const resolvedPanel = panel ? await toResolvedPanel(panel) : null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    image: resolvedPanel?.image ?? null,
    imageAlt: resolvedPanel?.imageAlt ?? null,
    callouts: callouts.map((callout) => ({
      title: callout.title,
      description: callout.description,
      icon: callout.icon,
    })),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateWhyUpwonProofCalloutInput,
  context: RequestContext,
): Promise<WhyUpwonProofCallout> =>
  withTransaction(async (client) => {
    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_WHY_UPWON_PROOF_CALLOUTS) {
      throw new ConflictError(
        `The artwork has room for at most ${LIMITS.MAX_WHY_UPWON_PROOF_CALLOUTS} callouts. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_PROOF_CALLOUT_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { title: created.title, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const update = async (
  id: string,
  patch: UpdateWhyUpwonProofCalloutInput,
  context: RequestContext,
): Promise<WhyUpwonProofCallout> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Callout');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Callout');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_PROOF_CALLOUT_UPDATED,
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

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<WhyUpwonProofCallout> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<WhyUpwonProofCallout[]> =>
  withTransaction(async (client) => {
    const total = await repo.countAll(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every callout', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a callout that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_PROOF_CALLOUTS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_WHY_UPWON_PROOF_CALLOUTS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Callout');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_PROOF_CALLOUT_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { title: existing.title },
      },
      context,
      client,
    );
  });
};
