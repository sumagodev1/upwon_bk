// src/modules/product-pages/fms-page/services/integrations-section.service.ts

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
import * as repo from '../repositories/integrations-section.repository';
import {
  CreateFmsIntegrationLogoInput,
  FmsIntegrationLogo,
  FmsIntegrationLogoFilters,
  FmsIntegrationSection,
  PublicFmsIntegrationsSection,
  ResolvedFmsIntegrationLogo,
  ResolvedFmsIntegrationSection,
  UpdateFmsIntegrationLogoInput,
  UpsertFmsIntegrationSectionInput,
} from '../types/integrations-section.types';

const MODULE = 'fms_page';
const SECTION_ENTITY = 'fms_integration_section';
const LOGO_ENTITY = 'fms_integration_logo';

/** Only images belong on the sphere; a PDF in an <img> is a broken mark. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the sphere renders without that mark rather
  // than failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

/** Rejects a file id that is not a live image of the right shape for a slot. */
const assertUsableImageFile = async (
  fileId: string,
  slot: ImageSlot,
  field: string,
): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('That file must be an image', [
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
    throw new ValidationError('That image is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

const toResolvedSection = async (
  section: FmsIntegrationSection,
): Promise<ResolvedFmsIntegrationSection> => ({
  ...section,
  centreLogo: await resolveSource(section.centreLogoUrl, section.centreLogoFileId),
});

const toResolvedLogo = async (
  logo: FmsIntegrationLogo,
): Promise<ResolvedFmsIntegrationLogo> => ({
  ...logo,
  logo: await resolveSource(logo.logoUrl, logo.logoFileId),
});

// -- the centre mark --------------------------------------------------------

/** Null before it has ever been set - a normal first-run state, not a 404. */
export const getSection = async (): Promise<ResolvedFmsIntegrationSection | null> => {
  const section = await repo.findSection();
  return section ? toResolvedSection(section) : null;
};

/**
 * Saves the centre mark, creating the record on the first call.
 *
 * Each field absent from the patch keeps whatever is stored; `null` clears it.
 * Setting one source clears the other, because the two are mutually exclusive -
 * resolved here rather than in SQL, since the upsert writes both columns
 * unconditionally and so needs to be handed the final pair.
 */
export const saveSection = async (
  input: UpsertFmsIntegrationSectionInput,
  context: RequestContext,
): Promise<ResolvedFmsIntegrationSection> => {
  if (input.centreLogoFileId) {
    await assertUsableImageFile(
      input.centreLogoFileId,
      'integrationsCentreLogo',
      'centreLogoFileId',
    );
  }

  const section = await withTransaction(async (client) => {
    const existing = await repo.findSection(client);

    let centreLogoUrl = existing?.centreLogoUrl ?? null;
    let centreLogoFileId = existing?.centreLogoFileId ?? null;

    if (input.centreLogoUrl !== undefined) {
      centreLogoUrl = input.centreLogoUrl;
      if (input.centreLogoUrl !== null && input.centreLogoFileId === undefined) {
        centreLogoFileId = null;
      }
    }
    if (input.centreLogoFileId !== undefined) {
      centreLogoFileId = input.centreLogoFileId;
      if (input.centreLogoFileId !== null && input.centreLogoUrl === undefined) {
        centreLogoUrl = null;
      }
    }

    const saved = await repo.upsertSection(
      { centreLogoUrl, centreLogoFileId },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_INTEGRATION_SECTION_UPDATED,
        module: MODULE,
        entityType: SECTION_ENTITY,
        entityId: saved.id,
        oldValues: existing
          ? {
              centreLogoUrl: existing.centreLogoUrl,
              centreLogoFileId: existing.centreLogoFileId,
            }
          : undefined,
        newValues: {
          centreLogoUrl: saved.centreLogoUrl,
          centreLogoFileId: saved.centreLogoFileId,
        },
      },
      context,
      client,
    );

    return saved;
  });

  return toResolvedSection(section);
};

// -- the orbit logos --------------------------------------------------------

export const listLogos = async (
  filters: FmsIntegrationLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedFmsIntegrationLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedFmsIntegrationLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Integration logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreateFmsIntegrationLogoInput,
  context: RequestContext,
): Promise<ResolvedFmsIntegrationLogo> => {
  if (input.logoFileId) {
    await assertUsableImageFile(input.logoFileId, 'integrationsLogo', 'logoFileId');
  }

  const logo = await withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_FMS_INTEGRATION_LOGOS) {
      throw new ConflictError(
        `The sphere holds at most ${LIMITS.MAX_FMS_INTEGRATION_LOGOS} logos. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_INTEGRATION_LOGO_CREATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: created.id,
        newValues: { logoAlt: created.logoAlt, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolvedLogo(logo);
};

export const updateLogo = async (
  id: string,
  patch: UpdateFmsIntegrationLogoInput,
  context: RequestContext,
): Promise<ResolvedFmsIntegrationLogo> => {
  if (patch.logoFileId) {
    await assertUsableImageFile(patch.logoFileId, 'integrationsLogo', 'logoFileId');
  }

  const logo = await withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Integration logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Integration logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_INTEGRATION_LOGO_UPDATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { logoAlt: existing.logoAlt, status: existing.status },
        newValues: { logoAlt: updated.logoAlt, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolvedLogo(logo);
};

export const setLogoStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedFmsIntegrationLogo> => {
  const logo = await withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Integration logo');

    const updated = await repo.updateLogoStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Integration logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_INTEGRATION_LOGO_UPDATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolvedLogo(logo);
};

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderLogos = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedFmsIntegrationLogo[]> => {
  const rows = await withTransaction(async (client) => {
    const total = await repo.countLogos(client);
    const existingIds = await repo.findExistingLogoIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more logos do not exist', [
        {
          field: 'ids',
          message: `Unknown logo ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_FMS_INTEGRATION_LOGO',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every logo', [
        {
          field: 'ids',
          message: `Expected all ${total} logo ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyLogoOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_INTEGRATION_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_FMS_INTEGRATION_LOGOS, offset: 0 },
      client,
    );
  });

  return Promise.all(rows.rows.map(toResolvedLogo));
};

export const removeLogo = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Integration logo');

    await repo.removeLogo(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_INTEGRATION_LOGO_DELETED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { logoAlt: existing.logoAlt },
      },
      context,
      client,
    );
  });
};

// -- the website-facing read ------------------------------------------------

/**
 * The copy, the centre mark and the orbit, in one response.
 *
 * Null rather than a partial section, so "nothing published" stays
 * distinguishable from "a section with empty fields" - the site then keeps the
 * sphere it ships. A logo whose uploaded image has since been deleted is
 * dropped rather than sent as a mark with no source; if that leaves the orbit
 * empty, the whole read returns null, because a heading beside a bare globe is
 * worse than the copy the site already has.
 */
export const getPublished = async (): Promise<PublicFmsIntegrationsSection | null> => {
  const [copy, section, logos] = await Promise.all([
    sectionCopyService.get('fms', 'integrations'),
    repo.findSection(),
    repo.findPublishedLogos(),
  ]);
  if (!copy || logos.length === 0) return null;

  const resolved = await Promise.all(logos.map(toResolvedLogo));
  const usable = resolved.filter(
    (row): row is ResolvedFmsIntegrationLogo & { logo: string } => row.logo !== null,
  );
  if (usable.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    centreLogo: section
      ? await resolveSource(section.centreLogoUrl, section.centreLogoFileId)
      : null,
    logos: usable.map((row) => ({ image: row.logo, alt: row.logoAlt })),
  };
};
