// src/modules/clients-page/services/testimonials-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../home-page/services/section-copy.service';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as repo from '../repositories/testimonials-section.repository';
import {
  ClientsTestimonial,
  ClientsTestimonialFilters,
  CreateClientsTestimonialInput,
  PublicClientsTestimonialsSection,
  ResolvedClientsTestimonial,
  UpdateClientsTestimonialInput,
} from '../types/testimonials-section.types';
import { CLIENTS_IMAGE_SPECS } from '../utils/clients-image-spec';

const MODULE = 'clients_page';
const ENTITY = 'clients_testimonial';

const toResolved = async (row: ClientsTestimonial): Promise<ResolvedClientsTestimonial> => ({
  ...row,
  avatar: await resolveImageSource(row.avatarUrl, row.avatarFileId),
});

const toResolvedMany = (rows: ClientsTestimonial[]): Promise<ResolvedClientsTestimonial[]> =>
  Promise.all(rows.map(toResolved));

const auditSnapshot = (row: ClientsTestimonial): Record<string, unknown> => ({
  quote: row.quote,
  author: row.author,
  company: row.company,
  rating: row.rating,
  avatarUrl: row.avatarUrl,
  avatarFileId: row.avatarFileId,
  fallbackColor: row.fallbackColor,
  displayOrder: row.displayOrder,
  status: row.status,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: ClientsTestimonialFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedClientsTestimonial[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows: await toResolvedMany(rows), meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ResolvedClientsTestimonial> => {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError('Testimonial');
  return toResolved(row);
};

/**
 * The website-facing read: the copy and every active testimonial in one
 * response. Null when the copy or the testimonials are missing - the page then
 * keeps the section it ships.
 */
export const getPublished = async (): Promise<PublicClientsTestimonialsSection | null> => {
  const [copy, rows] = await Promise.all([
    sectionCopyService.get('clients', 'testimonials'),
    repo.findPublished(),
  ]);
  if (!copy || rows.length === 0) return null;

  const resolved = await toResolvedMany(rows);

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext,
    testimonials: resolved.map((row) => ({
      quote: row.quote,
      author: row.author,
      company: row.company,
      rating: row.rating,
      // Null draws the author's initials in fallbackColor.
      avatar: row.avatar,
      fallbackColor: row.fallbackColor,
    })),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateClientsTestimonialInput,
  context: RequestContext,
): Promise<ResolvedClientsTestimonial> => {
  if (input.avatarFileId) {
    await assertUsableImageFile(
      input.avatarFileId,
      CLIENTS_IMAGE_SPECS.testimonialAvatar,
      'avatarFileId',
    );
  }

  const row = await withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_CLIENTS_TESTIMONIALS) {
      throw new ConflictError(
        `The marquee holds at most ${LIMITS.MAX_CLIENTS_TESTIMONIALS} testimonials. Delete or deactivate one first.`,
        'TESTIMONIAL_LIMIT_REACHED',
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_TESTIMONIAL_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: auditSnapshot(created),
      },
      context,
      client,
    );

    return created;
  });

  return toResolved(row);
};

export const update = async (
  id: string,
  patch: UpdateClientsTestimonialInput,
  context: RequestContext,
): Promise<ResolvedClientsTestimonial> => {
  if (patch.avatarFileId) {
    await assertUsableImageFile(
      patch.avatarFileId,
      CLIENTS_IMAGE_SPECS.testimonialAvatar,
      'avatarFileId',
    );
  }

  const row = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Testimonial');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Testimonial');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_TESTIMONIAL_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
        newValues: auditSnapshot(updated),
      },
      context,
      client,
    );

    return updated;
  });

  return toResolved(row);
};

export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedClientsTestimonial> => {
  const row = await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Testimonial');

    // Already in the requested state: no no-op write, no misleading audit row.
    if (existing.status === status) return existing;

    const updated = await repo.updateStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Testimonial');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_TESTIMONIAL_STATUS_CHANGED,
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

  return toResolved(row);
};

/** Takes the complete id list in its new order; partial lists are rejected. */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedClientsTestimonial[]> => {
  const rows = await withTransaction(async (client) => {
    const total = await repo.count(client);
    if (ids.length !== total) {
      throw new ValidationError('The order must list every testimonial', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a testimonial that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_TESTIMONIALS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_CLIENTS_TESTIMONIALS, offset: 0 },
      client,
    );
    return reordered.rows;
  });

  return toResolvedMany(rows);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Testimonial');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CLIENTS_TESTIMONIAL_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        // The full row, so a deleted quote is recoverable from the audit trail.
        oldValues: auditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
