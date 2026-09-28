// src/modules/industry-pages/spices-agro-page/services/platform-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { env } from '../../../../config/env';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import { getStorageProvider } from '../../../../storage/storage.factory';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as fileRepository from '../../../files/repositories/file.repository';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import { checkImageDimensions } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/platform-section.repository';
import {
  CreateSpicesAgroPlatformGroupInput,
  PublicSpicesAgroPlatformSection,
  ResolvedSpicesAgroPlatformPanel,
  SpicesAgroPlatformPanel,
  SpicesAgroPlatformGroup,
  SpicesAgroPlatformGroupFilters,
  UpdateSpicesAgroPlatformGroupInput,
  UpsertSpicesAgroPlatformPanelInput,
} from '../types/platform-section.types';

const MODULE = 'spices_agro_page';
const ENTITY = 'spices_agro_platform_group';
const PANEL_ENTITY = 'spices_agro_platform_panel';

/** Only images belong behind the section; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

// ── the background panel ──────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the site keeps its own background rather
  // than the request failing for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedPanel = async (
  panel: SpicesAgroPlatformPanel,
): Promise<ResolvedSpicesAgroPlatformPanel> => ({
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
    throw new ValidationError('Background must be an image', [
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

  const problem = checkImageDimensions('spicesAgroPlatformBackground', dimensions);
  if (problem) {
    throw new ValidationError('Background is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<ResolvedSpicesAgroPlatformPanel | null> => {
  const panel = await repo.findPanel();
  return panel ? toResolvedPanel(panel) : null;
};

export const upsertPanel = async (
  input: UpsertSpicesAgroPlatformPanelInput,
  context: RequestContext,
): Promise<ResolvedSpicesAgroPlatformPanel> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_PLATFORM_PANEL_UPDATED,
        module: MODULE,
        entityType: PANEL_ENTITY,
        entityId: saved.id,
        oldValues: existing ? { image: existing.imageUrl ?? existing.imageFileId } : undefined,
        newValues: { image: saved.imageUrl ?? saved.imageFileId },
      },
      context,
      client,
    );

    return toResolvedPanel(saved);
  });
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: SpicesAgroPlatformGroupFilters,
  pagination: PaginationParams,
): Promise<{ rows: SpicesAgroPlatformGroup[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<SpicesAgroPlatformGroup> => {
  const group = await repo.findById(id);
  if (!group) throw new NotFoundError('Group');
  return group;
};

/**
 * The website-facing read: the copy and every active group, in order.
 *
 * Null when the copy is missing or nothing is active - the site treats that as
 * "keep the built-in section", the same as an unreachable API.
 */
export const getPublished = async (): Promise<PublicSpicesAgroPlatformSection | null> => {
  const [copy, panel, groups] = await Promise.all([
    sectionCopyService.get('spices-agro', 'platform'),
    repo.findPanel(),
    repo.findPublished(),
  ]);
  if (!copy || groups.length === 0) return null;

  const resolvedPanel = panel ? await toResolvedPanel(panel) : null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    background: resolvedPanel?.image ?? null,
    groups: groups.map((group) => ({
      title: group.title,
      description: group.description,
      icon: group.icon,
    })),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateSpicesAgroPlatformGroupInput,
  context: RequestContext,
): Promise<SpicesAgroPlatformGroup> =>
  withTransaction(async (client) => {
    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_SPICES_AGRO_PLATFORM_GROUPS) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_SPICES_AGRO_PLATFORM_GROUPS} groups. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_PLATFORM_GROUP_CREATED,
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
  patch: UpdateSpicesAgroPlatformGroupInput,
  context: RequestContext,
): Promise<SpicesAgroPlatformGroup> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Group');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Group');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_PLATFORM_GROUP_UPDATED,
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
): Promise<SpicesAgroPlatformGroup> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<SpicesAgroPlatformGroup[]> =>
  withTransaction(async (client) => {
    const total = await repo.countAll(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every group', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a group that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_PLATFORM_GROUPS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_SPICES_AGRO_PLATFORM_GROUPS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Group');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SPICES_AGRO_PLATFORM_GROUP_DELETED,
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
