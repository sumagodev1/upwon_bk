// src/modules/product-pages/hreasy-page/services/capabilities-section.service.ts

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
import * as capabilitiesRepository from '../repositories/capabilities-section.repository';
import {
  CreateHreasyCapabilityModuleInput,
  HreasyCapabilityModule,
  HreasyCapabilityModuleFilters,
  PublicHreasyCapabilitiesSection,
  ResolvedHreasyCapabilityModule,
  UpdateHreasyCapabilityModuleInput,
} from '../types/capabilities-section.types';

const MODULE = 'hreasy_page';
const ENTITY = 'hreasy_capability_module';

/** Only images belong in a panel; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the module resolves without its artwork
  // rather than failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (
  module: HreasyCapabilityModule,
): Promise<ResolvedHreasyCapabilityModule> => ({
  ...module,
  image: await resolveSource(module.imageUrl, module.imageFileId),
});

const toResolvedMany = (
  modules: HreasyCapabilityModule[],
): Promise<ResolvedHreasyCapabilityModule[]> => Promise.all(modules.map(toResolved));

/**
 * Rejects a file id that is not a live image large enough for the panel.
 *
 * Size only, no ratio: the composites differ in height from one stage to the
 * next and the panel draws them contained, so the shape is the designer's
 * business rather than a rule worth failing an upload over.
 */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const field = 'imageFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Panel artwork must be an image', [
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

  const problem = checkImageDimensions('hreasyCapabilityPanel', dimensions);
  if (problem) {
    throw new ValidationError('Panel artwork is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

/**
 * Refuses a slug already in use.
 *
 * A field error rather than the raw unique-violation a 409 would carry: the
 * slug is authored, so the message belongs on the input that produced it.
 *
 * @param excludeId the module being changed, so re-saving its own slug is fine
 */
const assertSlugFree = async (
  slug: string,
  excludeId: string | null,
  executor?: Parameters<typeof capabilitiesRepository.findBySlug>[1],
): Promise<void> => {
  const existing = await capabilitiesRepository.findBySlug(slug, executor);
  if (!existing || existing.id === excludeId) return;

  throw new ValidationError('That slug is already in use', [
    {
      field: 'slug',
      message: `"${slug}" already belongs to ${existing.name}. Slugs identify a module in links, so they have to be unique.`,
      code: 'DUPLICATE_SLUG',
    },
  ]);
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: HreasyCapabilityModuleFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedHreasyCapabilityModule[]; meta: PaginationMeta }> => {
  const { rows, total } = await capabilitiesRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedHreasyCapabilityModule> => {
  const module = await capabilitiesRepository.findById(id);
  if (!module) throw new NotFoundError('HREasy capability module');
  return toResolved(module);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy that heads the section and at least one module.
 * With either missing the site keeps the list it ships, which is a complete
 * working section - better than a heading over an empty panel.
 */
export const getPublished =
  async (): Promise<PublicHreasyCapabilitiesSection | null> => {
    const modules = await capabilitiesRepository.findPublished();
    if (modules.length === 0) return null;

    const copy = await sectionCopyService.get('hreasy', 'capabilities');
    if (!copy) return null;

    const resolved = await toResolvedMany(modules);

    return {
      eyebrow: copy.eyebrow,
      heading: copy.heading,
      headingLines: copy.headingLines,
      subtext: copy.subtext ?? '',
      modules: resolved.map((module) => ({
        slug: module.slug,
        name: module.name,
        image: module.image,
      })),
    };
  };

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateHreasyCapabilityModuleInput,
  context: RequestContext,
): Promise<ResolvedHreasyCapabilityModule> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  const module = await withTransaction(async (client) => {
    const existing = await capabilitiesRepository.countAll(client);
    if (existing >= LIMITS.MAX_HREASY_CAPABILITY_MODULES) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_HREASY_CAPABILITY_MODULES} modules. Delete or deactivate one first.`,
      );
    }

    await assertSlugFree(input.slug, null, client);

    const displayOrder =
      input.displayOrder ?? (await capabilitiesRepository.nextDisplayOrder(client));
    const created = await capabilitiesRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CAPABILITY_MODULE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { name: created.name, slug: created.slug, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(module);
};

export const update = async (
  id: string,
  patch: UpdateHreasyCapabilityModuleInput,
  context: RequestContext,
): Promise<ResolvedHreasyCapabilityModule> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  const module = await withTransaction(async (client) => {
    const existing = await capabilitiesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('HREasy capability module');

    if (patch.slug !== undefined) await assertSlugFree(patch.slug, id, client);

    const updated = await capabilitiesRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('HREasy capability module');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CAPABILITY_MODULE_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { name: existing.name, slug: existing.slug, status: existing.status },
        newValues: { name: updated.name, slug: updated.slug, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(module);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedHreasyCapabilityModule> => {
  const module = await withTransaction(async (client) => {
    const existing = await capabilitiesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('HREasy capability module');

    const updated = await capabilitiesRepository.updateStatus(
      id,
      status,
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('HREasy capability module');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CAPABILITY_MODULE_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(module);
};

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedHreasyCapabilityModule[]> => {
  const modules = await withTransaction(async (client) => {
    const total = await capabilitiesRepository.countAll(client);
    const existingIds = await capabilitiesRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more modules do not exist', [
        {
          field: 'ids',
          message: `Unknown module ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_HREASY_CAPABILITY_MODULE',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every module', [
        {
          field: 'ids',
          message: `Expected all ${total} module ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await capabilitiesRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CAPABILITY_MODULES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return capabilitiesRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_HREASY_CAPABILITY_MODULES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(modules.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await capabilitiesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('HREasy capability module');

    await capabilitiesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_CAPABILITY_MODULE_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { name: existing.name, slug: existing.slug },
      },
      context,
      client,
    );
  });
};
