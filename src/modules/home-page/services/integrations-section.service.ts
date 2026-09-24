// src/modules/home-page/services/integrations-section.service.ts

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
import * as integrationsRepository from '../repositories/integrations-section.repository';
import * as sectionCopyService from './section-copy.service';
import { checkImageDimensions, ImageSlot } from '../utils/image-spec';
import { readImageDimensions } from '../utils/image-dimensions';
import {
  CreateIntegrationsEntryInput,
  IntegrationsEntry,
  IntegrationsEntryFilters,
  PublicIntegrationsSection,
  ResolvedIntegrationsEntry,
  UpdateIntegrationsEntryInput,
} from '../types/integrations-section.types';

const MODULE = 'home_page';
const ENTITY = 'home_integrations_entry';

/** Only images belong on the sphere; a PDF in an <img> is a broken badge. */
const IMAGE_MIME_PREFIX = 'image/';

/**
 * Turns a url/fileId pair into the one URL to render.
 *
 * A soft-deleted or purged asset resolves to null rather than failing the
 * request: the orbit logo is then dropped from the public read, and the centre
 * logo falls back to the mark the site ships.
 */
const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolved = async (
  entry: IntegrationsEntry,
): Promise<ResolvedIntegrationsEntry> => ({
  ...entry,
  logo: await resolveSource(entry.logoUrl, entry.logoFileId),
  centreLogo: await resolveSource(entry.centreLogoUrl, entry.centreLogoFileId),
});

const toResolvedMany = (
  entries: IntegrationsEntry[],
): Promise<ResolvedIntegrationsEntry[]> => Promise.all(entries.map(toResolved));

/**
 * Rejects a file id that is not a live image of the right shape.
 *
 * Both slots render object-contain, so neither carries a ratio check - see the
 * spec registry for why. Width is what the check is really enforcing.
 */
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
    throw new ValidationError('Logo must be an image', [
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
    throw new ValidationError('Logo is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: IntegrationsEntryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedIntegrationsEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await integrationsRepository.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedIntegrationsEntry> => {
  const entry = await integrationsRepository.findById(id);
  if (!entry) throw new NotFoundError('Integrations entry');
  return toResolved(entry);
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Folds the rows back into the one block the site renders: the copy and the
 * centre logo come from the first active entry, and the sphere is every active
 * entry whose logo still resolves. Null rather than an empty section, so
 * "nothing published" stays distinguishable from "a section with empty
 * fields", which would render as a heading beside an empty globe.
 */
/**
 * Just the sphere's logos, without the copy that heads the home page section.
 *
 * The ERP page's trust establishers draws the same sphere - the same partners,
 * saying the same thing - so it reads this rather than keeping a second list
 * that would drift the first time somebody added a partner to one and not the
 * other. It is separate from getPublished() because that one returns null
 * without the home page's own copy, which has nothing to do with the ERP page.
 */
export const getPublishedLogos = async (): Promise<{
  logos: Array<{ image: string; alt: string | null }>;
  centreLogo: string | null;
}> => {
  const entries = await integrationsRepository.findPublished();
  if (entries.length === 0) return { logos: [], centreLogo: null };

  const resolved = await toResolvedMany(entries);

  return {
    // An entry whose asset went missing is dropped rather than pinned to the
    // sphere as a broken image.
    logos: resolved.flatMap((entry) =>
      entry.logo ? [{ image: entry.logo, alt: entry.logoAlt }] : [],
    ),
    centreLogo: resolved[0].centreLogo,
  };
};

export const getPublished = async (): Promise<PublicIntegrationsSection | null> => {
  const entries = await integrationsRepository.findPublished();
  if (entries.length === 0) return null;

  /*
   * The section's copy lives in home_section_copy, not on these rows, so a
   * section with entries but no copy authored yet has nothing to head them
   * with - which reads as "not published" rather than as a bare list.
   */
  const copy = await sectionCopyService.get('home', 'integrations');
  if (!copy) return null;

  const resolved = await toResolvedMany(entries);
  const first = resolved[0];

  const logos = resolved.flatMap((entry) =>
    entry.logo ? [{ image: entry.logo, alt: entry.logoAlt }] : [],
  );

  // A heading beside a bare sphere is a worse page than the built-in one.
  if (logos.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    centreLogo: first.centreLogo,
    logos,
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateIntegrationsEntryInput,
  context: RequestContext,
): Promise<ResolvedIntegrationsEntry> => {
  if (input.logoFileId) {
    await assertUsableImageFile(input.logoFileId, 'integrationsLogo', 'logoFileId');
  }
  if (input.centreLogoFileId) {
    await assertUsableImageFile(
      input.centreLogoFileId,
      'integrationsCentreLogo',
      'centreLogoFileId',
    );
  }

  const entry = await withTransaction(async (client) => {
    const existing = await integrationsRepository.countAll(client);
    if (existing >= LIMITS.MAX_INTEGRATIONS_ENTRIES) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_INTEGRATIONS_ENTRIES} logos. Delete or deactivate one first.`,
      );
    }

    /*
     * The centre logo belongs to the section, not to this row. A create that
     * carries one sets it for every row; a create that carries none inherits
     * what the section already shows, rather than blanking it if this entry
     * happens to become the first active one.
     */
    const carriesCentre = Boolean(input.centreLogoUrl || input.centreLogoFileId);
    const centre = carriesCentre
      ? { centreLogoUrl: input.centreLogoUrl, centreLogoFileId: input.centreLogoFileId }
      : ((await integrationsRepository.findSectionCentreLogo(client)) ?? {
          centreLogoUrl: null,
          centreLogoFileId: null,
        });

    const displayOrder =
      input.displayOrder ?? (await integrationsRepository.nextDisplayOrder(client));

    const created = await integrationsRepository.create(
      { ...input, ...centre, displayOrder },
      context.adminId,
      client,
    );

    if (carriesCentre) {
      await integrationsRepository.syncCentreLogo(
        created.id,
        created.centreLogoUrl,
        created.centreLogoFileId,
        context.adminId,
        client,
      );
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INTEGRATIONS_ENTRY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { logoAlt: created.logoAlt, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(entry);
};

export const update = async (
  id: string,
  patch: UpdateIntegrationsEntryInput,
  context: RequestContext,
): Promise<ResolvedIntegrationsEntry> => {
  if (patch.logoFileId) {
    await assertUsableImageFile(patch.logoFileId, 'integrationsLogo', 'logoFileId');
  }
  if (patch.centreLogoFileId) {
    await assertUsableImageFile(
      patch.centreLogoFileId,
      'integrationsCentreLogo',
      'centreLogoFileId',
    );
  }

  const entry = await withTransaction(async (client) => {
    const existing = await integrationsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Integrations entry');

    const updated = await integrationsRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Integrations entry');

    /*
     * One image for the whole section, stored per row: an edit that touched
     * only this row would leave the site showing whichever logo sits on the
     * first active entry, which is usually not the row just edited.
     */
    if (patch.centreLogoUrl !== undefined || patch.centreLogoFileId !== undefined) {
      await integrationsRepository.syncCentreLogo(
        updated.id,
        updated.centreLogoUrl,
        updated.centreLogoFileId,
        context.adminId,
        client,
      );
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INTEGRATIONS_ENTRY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { logoAlt: existing.logoAlt, status: existing.status },
        newValues: { logoAlt: updated.logoAlt, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(entry);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedIntegrationsEntry> => {
  const entry = await withTransaction(async (client) => {
    const existing = await integrationsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Integrations entry');

    const updated = await integrationsRepository.updateStatus(
      id,
      status,
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('Integrations entry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INTEGRATIONS_ENTRY_UPDATED,
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

  return toResolved(entry);
};

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates, which
 * a "move entry X to position N" endpoint can when two admins drag at once.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedIntegrationsEntry[]> => {
  const entries = await withTransaction(async (client) => {
    const total = await integrationsRepository.countAll(client);
    const existingIds = await integrationsRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more entries do not exist', [
        {
          field: 'ids',
          message: `Unknown entry ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_INTEGRATIONS_ENTRY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every entry', [
        {
          field: 'ids',
          message: `Expected all ${total} entry ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await integrationsRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INTEGRATIONS_ENTRIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return integrationsRepository.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_INTEGRATIONS_ENTRIES, offset: 0 },
      client,
    );
  });

  return toResolvedMany(entries.rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await integrationsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Integrations entry');

    await integrationsRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_INTEGRATIONS_ENTRY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { logoAlt: existing.logoAlt },
      },
      context,
      client,
    );
  });
};
