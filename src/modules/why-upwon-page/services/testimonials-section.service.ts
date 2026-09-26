// src/modules/why-upwon-page/services/testimonials-section.service.ts

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
import * as repo from '../repositories/testimonials-section.repository';
import {
  CreateWhyUpwonClientLogoInput,
  CreateWhyUpwonTestimonialInput,
  PublicWhyUpwonTestimonialsSection,
  ResolvedWhyUpwonClientLogo,
  ResolvedWhyUpwonTestimonial,
  UpdateWhyUpwonClientLogoInput,
  UpdateWhyUpwonTestimonialInput,
  UpsertWhyUpwonTestimonialsPanelInput,
  WhyUpwonClientLogo,
  WhyUpwonClientLogoFilters,
  WhyUpwonTestimonial,
  WhyUpwonTestimonialFilters,
  WhyUpwonTestimonialsPanel,
} from '../types/testimonials-section.types';

const MODULE = 'why_upwon_page';
const LOGO_ENTITY = 'why_upwon_client_logo';
const TESTIMONIAL_ENTITY = 'why_upwon_testimonial';
const PANEL_ENTITY = 'why_upwon_testimonials_panel';

/** Only images belong on the wall and the card; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

/*
 * The marks are checked against the home page's trust-strip slot rather than a
 * slot of their own, as the FMS proof strip's are: the same brand logos, drawn
 * the same way - object-contain at a fixed height.
 */
const LOGO_SLOT = 'trustLogo' as const;

// ── the client wall ───────────────────────────────────────────────────────

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the wall skips that mark rather than
  // failing the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

const toResolvedLogo = async (
  logo: WhyUpwonClientLogo,
): Promise<ResolvedWhyUpwonClientLogo> => ({
  ...logo,
  image: await resolveSource(logo.imageUrl, logo.imageFileId),
});

/** Rejects a file id that is not a live image of the right shape for the slot. */
const assertUsableImageFile = async (
  fileId: string,
  slot: 'trustLogo' = LOGO_SLOT,
  what = 'Logo',
  field = 'imageFileId',
): Promise<void> => {
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

export const listLogos = async (
  filters: WhyUpwonClientLogoFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedWhyUpwonClientLogo[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllLogos(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedLogo)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getLogoById = async (id: string): Promise<ResolvedWhyUpwonClientLogo> => {
  const logo = await repo.findLogoById(id);
  if (!logo) throw new NotFoundError('Logo');
  return toResolvedLogo(logo);
};

export const createLogo = async (
  input: CreateWhyUpwonClientLogoInput,
  context: RequestContext,
): Promise<ResolvedWhyUpwonClientLogo> => {
  if (input.imageFileId) await assertUsableImageFile(input.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.countLogos(client);
    if (existing >= LIMITS.MAX_WHY_UPWON_CLIENT_LOGOS) {
      throw new ConflictError(
        `The client wall holds at most ${LIMITS.MAX_WHY_UPWON_CLIENT_LOGOS} logos`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextLogoOrder(client));
    const created = await repo.createLogo({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_CLIENT_LOGO_CREATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: created.id,
        newValues: { alt: created.alt, status: created.status },
      },
      context,
      client,
    );

    return toResolvedLogo(created);
  });
};

export const updateLogo = async (
  id: string,
  patch: UpdateWhyUpwonClientLogoInput,
  context: RequestContext,
): Promise<ResolvedWhyUpwonClientLogo> => {
  if (patch.imageFileId) await assertUsableImageFile(patch.imageFileId);

  return withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    const updated = await repo.updateLogo(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Logo');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_CLIENT_LOGO_UPDATED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt, status: existing.status },
        newValues: { alt: updated.alt, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedLogo(updated);
  });
};

export const setLogoStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedWhyUpwonClientLogo> => updateLogo(id, { status }, context);

export const reorderLogos = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedWhyUpwonClientLogo[]> =>
  withTransaction(async (client) => {
    const total = await repo.countLogos(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every logo', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingLogoIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a logo that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyLogoOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_CLIENT_LOGOS_REORDERED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllLogos(
      {},
      { page: 1, limit: LIMITS.MAX_WHY_UPWON_CLIENT_LOGOS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedLogo));
  });

export const removeLogo = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findLogoByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Logo');

    await repo.removeLogo(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_CLIENT_LOGO_DELETED,
        module: MODULE,
        entityType: LOGO_ENTITY,
        entityId: id,
        oldValues: { alt: existing.alt },
      },
      context,
      client,
    );
  });
};

// ── the testimonials ──────────────────────────────────────────────────────

const toResolvedTestimonial = async (
  testimonial: WhyUpwonTestimonial,
): Promise<ResolvedWhyUpwonTestimonial> => ({
  ...testimonial,
  logo: await resolveSource(testimonial.logoUrl, testimonial.logoFileId),
});

export const listTestimonials = async (
  filters: WhyUpwonTestimonialFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedWhyUpwonTestimonial[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllTestimonials(filters, pagination);
  return {
    rows: await Promise.all(rows.map(toResolvedTestimonial)),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getTestimonialById = async (id: string): Promise<ResolvedWhyUpwonTestimonial> => {
  const testimonial = await repo.findTestimonialById(id);
  if (!testimonial) throw new NotFoundError('Testimonial');
  return toResolvedTestimonial(testimonial);
};

export const createTestimonial = async (
  input: CreateWhyUpwonTestimonialInput,
  context: RequestContext,
): Promise<ResolvedWhyUpwonTestimonial> => {
  if (input.logoFileId) await assertUsableImageFile(input.logoFileId, LOGO_SLOT, 'Logo', 'logoFileId');

  return withTransaction(async (client) => {
    const existing = await repo.countTestimonials(client);
    if (existing >= LIMITS.MAX_WHY_UPWON_TESTIMONIALS) {
      throw new ConflictError(
        `The card turns over at most ${LIMITS.MAX_WHY_UPWON_TESTIMONIALS} testimonials`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextTestimonialOrder(client));
    const created = await repo.createTestimonial(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_TESTIMONIAL_CREATED,
        module: MODULE,
        entityType: TESTIMONIAL_ENTITY,
        entityId: created.id,
        newValues: { brand: created.brand, author: created.author },
      },
      context,
      client,
    );

    return toResolvedTestimonial(created);
  });
};

export const updateTestimonial = async (
  id: string,
  patch: UpdateWhyUpwonTestimonialInput,
  context: RequestContext,
): Promise<ResolvedWhyUpwonTestimonial> => {
  if (patch.logoFileId) await assertUsableImageFile(patch.logoFileId, LOGO_SLOT, 'Logo', 'logoFileId');

  return withTransaction(async (client) => {
    const existing = await repo.findTestimonialByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Testimonial');

    const updated = await repo.updateTestimonial(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Testimonial');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_TESTIMONIAL_UPDATED,
        module: MODULE,
        entityType: TESTIMONIAL_ENTITY,
        entityId: id,
        oldValues: { brand: existing.brand, status: existing.status },
        newValues: { brand: updated.brand, status: updated.status },
      },
      context,
      client,
    );

    return toResolvedTestimonial(updated);
  });
};

export const setTestimonialStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedWhyUpwonTestimonial> => updateTestimonial(id, { status }, context);

export const reorderTestimonials = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedWhyUpwonTestimonial[]> =>
  withTransaction(async (client) => {
    const total = await repo.countTestimonials(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every testimonial', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingTestimonialIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a testimonial that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyTestimonialOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_TESTIMONIALS_REORDERED,
        module: MODULE,
        entityType: TESTIMONIAL_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllTestimonials(
      {},
      { page: 1, limit: LIMITS.MAX_WHY_UPWON_TESTIMONIALS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map(toResolvedTestimonial));
  });

export const removeTestimonial = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findTestimonialByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Testimonial');

    await repo.removeTestimonial(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_TESTIMONIAL_DELETED,
        module: MODULE,
        entityType: TESTIMONIAL_ENTITY,
        entityId: id,
        oldValues: { brand: existing.brand, author: existing.author },
      },
      context,
      client,
    );
  });
};

// ── the panel ─────────────────────────────────────────────────────────────

/** Null when the panel has never been authored - a normal first-run state. */
export const getPanel = async (): Promise<WhyUpwonTestimonialsPanel | null> => repo.findPanel();

export const upsertPanel = async (
  input: UpsertWhyUpwonTestimonialsPanelInput,
  context: RequestContext,
): Promise<WhyUpwonTestimonialsPanel> =>
  withTransaction(async (client) => {
    const existing = await repo.findPanel(client);
    const saved = await repo.upsertPanel(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.WHY_UPWON_TESTIMONIALS_PANEL_UPDATED,
        module: MODULE,
        entityType: PANEL_ENTITY,
        entityId: saved.id,
        oldValues: existing
          ? { leadLine: existing.leadLine, buttonLabel: existing.buttonLabel }
          : undefined,
        newValues: { leadLine: saved.leadLine, buttonLabel: saved.buttonLabel },
      },
      context,
      client,
    );

    return saved;
  });

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy, the panel, the testimonials and the
 * client wall.
 *
 * Null when the copy is missing, or when neither list has anything to show -
 * the page then keeps the section it ships. One empty list is allowed.
 *
 * A testimonial or logo whose file has been deleted is dropped rather than
 * published with a null source, which would draw a broken image.
 */
export const getPublished = async (): Promise<PublicWhyUpwonTestimonialsSection | null> => {
  const [copy, panel, testimonials, logos] = await Promise.all([
    sectionCopyService.get('why-upwon', 'testimonials'),
    repo.findPanel(),
    repo.findPublishedTestimonials(),
    repo.findPublishedLogos(),
  ]);
  if (!copy) return null;

  const resolvedTestimonials = (await Promise.all(testimonials.map(toResolvedTestimonial)))
    .filter(
      (item): item is ResolvedWhyUpwonTestimonial & { logo: string } => item.logo !== null,
    )
    .map((item) => ({
      quote: item.quote,
      author: item.author,
      role: item.role,
      brand: item.brand,
      category: item.category,
      location: item.location,
      logo: item.logo,
    }));

  const resolvedLogos = (await Promise.all(logos.map(toResolvedLogo)))
    .filter(
      (logo): logo is ResolvedWhyUpwonClientLogo & { image: string } => logo.image !== null,
    )
    .map((logo) => ({ image: logo.image, alt: logo.alt }));

  if (resolvedTestimonials.length === 0 && resolvedLogos.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    panel: panel
      ? {
          leadLine: panel.leadLine,
          // Both halves or neither, which the table also enforces.
          button:
            panel.buttonLabel && panel.buttonHref
              ? { label: panel.buttonLabel, href: panel.buttonHref }
              : null,
          wallLabel: panel.wallLabel,
        }
      : null,
    testimonials: resolvedTestimonials,
    logos: resolvedLogos,
  };
};
