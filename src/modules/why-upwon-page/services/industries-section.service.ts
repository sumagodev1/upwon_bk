// src/modules/why-upwon-page/services/industries-section.service.ts

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
import * as repo from '../repositories/industries-section.repository';
import {
  CreateWhyUpwonIndustryInput,
  PublicWhyUpwonIndustrySection,
  ResolvedWhyUpwonIndustry,
  WhyUpwonIndustry,
  WhyUpwonIndustryFilters,
  UpdateWhyUpwonIndustryInput,
} from '../types/industries-section.types';

const MODULE = 'why_upwon_page';
const CATEGORY_ENTITY = 'why_upwon_industry';

/** Only images belong on a card; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

/* The photos are covered into a fixed frame on each card, so they have their own slot. */

// ── the industries ──────────────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the row skips that tile rather than
  // failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedIndustry = async (
  industry: WhyUpwonIndustry,
): Promise<ResolvedWhyUpwonIndustry> => ({
  ...industry,
  image: await resolveSource(industry.imageUrl, industry.imageFileId),
});

/** Rejects a file id that is not a live image of the right shape for the slot. */
const assertUsableImageFile = async (fileId: string): Promise<void> => {
  const what = 'Photo';
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

  const problem = checkImageDimensions('whyUpwonIndustryPhoto', dimensions);
  if (problem) {
    throw new ValidationError(`${what} is the wrong size`, [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

export const listIndustries = async (
  filters: WhyUpwonIndustryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedWhyUpwonIndustry[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllIndustries(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedIndustry)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getIndustryById = async (id: string): Promise<ResolvedWhyUpwonIndustry> => {
  const industry = await repo.findIndustryById(id);
  if (!industry) throw new NotFoundError('Industry');
  return toResolvedIndustry(industry);
};

export const createIndustry = async (
  input: CreateWhyUpwonIndustryInput,
  context: RequestContext,
): Promise<ResolvedWhyUpwonIndustry> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countIndustries(client);
    if (existing >= LIMITS.MAX_WHY_UPWON_INDUSTRIES) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_WHY_UPWON_INDUSTRIES} industries`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextIndustryOrder(client));
    const created = await repo.createIndustry({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_INDUSTRY_CREATED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: created.id,
        newValues: { label: created.label, status: created.status },
      },
      context,
      client,
    );

    return toResolvedIndustry(created);
  });
};

export const updateIndustry = async (
  id: string,
  patch: UpdateWhyUpwonIndustryInput,
  context: RequestContext,
): Promise<ResolvedWhyUpwonIndustry> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findIndustryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Industry');

    const updated = await repo.updateIndustry(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Industry');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_INDUSTRY_UPDATED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedIndustry(updated);
  });
};

export const setIndustryStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedWhyUpwonIndustry> => updateIndustry(id, { status }, context);

export const reorderIndustries = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedWhyUpwonIndustry[]> =>
  withTransaction(async (client) => {
    const total = await repo.countIndustries(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every industry', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIndustryIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a industry that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyIndustryOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_INDUSTRIES_REORDERED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllIndustries(
      {},
      { page: 1, limit: LIMITS.MAX_WHY_UPWON_INDUSTRIES, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedIndustry));
  });

export const removeIndustry = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findIndustryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Industry');

    await repo.removeIndustry(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_INDUSTRY_DELETED,
        module: MODULE,
        entityType: CATEGORY_ENTITY,
        entityId: id,
        oldValues: { label: existing.label },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy and the industries, in order.
 *
 * An industry whose photo has been deleted is dropped rather than published
 * with a null source, which would draw an empty card. Null when the copy is
 * missing or nothing is left - the page then keeps the section it ships.
 */
export const getPublished = async (): Promise<PublicWhyUpwonIndustrySection | null> => {
  const [copy, industries] = await Promise.all([
    sectionCopyService.get('why-upwon', 'industries'),
    repo.findPublishedIndustries(),
  ]);
  if (!copy) return null;

  const resolved = (await Promise.all(industries.map(toResolvedIndustry)))
    .filter(
      (industry): industry is ResolvedWhyUpwonIndustry & { image: string } =>
        industry.image !== null,
    )
    .map((industry) => ({ image: industry.image, label: industry.label, href: industry.href }));

  if (resolved.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    industries: resolved,
  };
};
