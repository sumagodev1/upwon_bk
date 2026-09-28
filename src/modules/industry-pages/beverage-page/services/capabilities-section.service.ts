// src/modules/industry-pages/beverage-page/services/capabilities-section.service.ts

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
import { checkImageDimensions, ImageSlot } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/capabilities-section.repository';
import {
  BeverageCapabilitiesPanel,
  BeverageCapability,
  BeverageCapabilityFilters,
  CreateBeverageCapabilityInput,
  PublicBeverageCapabilitiesSection,
  ResolvedBeverageCapabilitiesPanel,
  ResolvedBeverageCapability,
  UpdateBeverageCapabilityInput,
  UpsertBeverageCapabilitiesPanelInput,
} from '../types/capabilities-section.types';

const MODULE = 'beverage_page';
const PANEL_ENTITY = 'beverage_capabilities_panel';
const CAPABILITY_ENTITY = 'beverage_capability';

/** Only images belong here; a PDF renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: resolve without it rather than failing the
  // whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

/** Rejects a file id that is not a live image of the right shape for its slot. */
const assertUsableImageFile = async (
  fileId: string,
  slot: ImageSlot,
  what: string,
): Promise<void> => {
  const field = 'imageFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError(`${what} must be an image`, [
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

  const problem = checkImageDimensions(slot, dimensions);
  if (problem) {
    throw new ValidationError(`${what} is the wrong size`, [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

// ── the background panel ──────────────────────────────────────────────────

const toResolvedPanel = async (
  panel: BeverageCapabilitiesPanel,
): Promise<ResolvedBeverageCapabilitiesPanel> => ({
  ...panel,
  image: await resolveSource(panel.imageUrl, panel.imageFileId),
});

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<ResolvedBeverageCapabilitiesPanel | null> => {
  const panel = await repo.findPanel();
  return panel ? toResolvedPanel(panel) : null;
};

export const upsertPanel = async (
  input: UpsertBeverageCapabilitiesPanelInput,
  context: RequestContext,
): Promise<ResolvedBeverageCapabilitiesPanel> => {
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, 'beverageCapabilitiesBackground', 'Background');
  }

  return withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BEVERAGE_CAPABILITIES_PANEL_UPDATED,
        module: MODULE,
        entityType: PANEL_ENTITY,
        entityId: saved.id,
        oldValues: existing
          ? { image: existing.imageUrl ?? existing.imageFileId }
          : undefined,
        newValues: { image: saved.imageUrl ?? saved.imageFileId },
      },
      context,
      client,
    );

    return toResolvedPanel(saved);
  });
};

// ── the capabilities ──────────────────────────────────────────────────────

const toResolvedCapability = async (
  capability: BeverageCapability,
): Promise<ResolvedBeverageCapability> => ({
  ...capability,
  image: await resolveSource(capability.imageUrl, capability.imageFileId),
});

export const listCapabilities = async (
  filters: BeverageCapabilityFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedBeverageCapability[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllCapabilities(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedCapability)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getCapabilityById = async (id: string): Promise<ResolvedBeverageCapability> => {
  const capability = await repo.findCapabilityById(id);
  if (!capability) throw new NotFoundError('Capability');
  return toResolvedCapability(capability);
};

export const createCapability = async (
  input: CreateBeverageCapabilityInput,
  context: RequestContext,
): Promise<ResolvedBeverageCapability> => {
  if (input.imageFileId) {
    await assertUsableImageFile(input.imageFileId, 'beverageCapabilityScreenshot', 'Screenshot');
  }

  return withTransaction(async (client) => {
    const existing = await repo.countCapabilities(client);
    if (existing >= LIMITS.MAX_BEVERAGE_CAPABILITIES) {
      throw new ConflictError(
        `The tab list holds at most ${LIMITS.MAX_BEVERAGE_CAPABILITIES} capabilities. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextCapabilityOrder(client));
    const created = await repo.createCapability(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BEVERAGE_CAPABILITY_CREATED,
        module: MODULE,
        entityType: CAPABILITY_ENTITY,
        entityId: created.id,
        newValues: { title: created.title, status: created.status },
      },
      context,
      client,
    );

    return toResolvedCapability(created);
  });
};

export const updateCapability = async (
  id: string,
  patch: UpdateBeverageCapabilityInput,
  context: RequestContext,
): Promise<ResolvedBeverageCapability> => {
  if (patch.imageFileId) {
    await assertUsableImageFile(patch.imageFileId, 'beverageCapabilityScreenshot', 'Screenshot');
  }

  return withTransaction(async (client) => {
    const existing = await repo.findCapabilityByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability');

    const updated = await repo.updateCapability(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Capability');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BEVERAGE_CAPABILITY_UPDATED,
        module: MODULE,
        entityType: CAPABILITY_ENTITY,
        entityId: id,
        oldValues: { title: existing.title, status: existing.status },
        newValues: { title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedCapability(updated);
  });
};

export const setCapabilityStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedBeverageCapability> => updateCapability(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderCapabilities = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedBeverageCapability[]> =>
  withTransaction(async (client) => {
    const total = await repo.countCapabilities(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every capability', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingCapabilityIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a capability that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyCapabilityOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BEVERAGE_CAPABILITIES_REORDERED,
        module: MODULE,
        entityType: CAPABILITY_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllCapabilities(
      {},
      { page: 1, limit: LIMITS.MAX_BEVERAGE_CAPABILITIES, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedCapability));
  });

export const removeCapability = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findCapabilityByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Capability');

    await repo.removeCapability(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BEVERAGE_CAPABILITY_DELETED,
        module: MODULE,
        entityType: CAPABILITY_ENTITY,
        entityId: id,
        oldValues: { title: existing.title },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy, the background and the
 * capabilities.
 *
 * Null when the copy is missing or no capability is active - the page then
 * keeps the section it ships. A missing panel keeps the site's background.
 */
export const getPublished = async (): Promise<PublicBeverageCapabilitiesSection | null> => {
  const [copy, panel, capabilities] = await Promise.all([
    sectionCopyService.get('beverage', 'capabilities'),
    repo.findPanel(),
    repo.findPublishedCapabilities(),
  ]);
  if (!copy || capabilities.length === 0) return null;

  const resolvedPanel = panel ? await toResolvedPanel(panel) : null;
  const resolved = await Promise.all(capabilities.map(toResolvedCapability));

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    background: resolvedPanel?.image ?? null,
    capabilities: resolved.map((capability) => ({
      title: capability.title,
      description: capability.description,
      image: capability.image,
    })),
  };
};
