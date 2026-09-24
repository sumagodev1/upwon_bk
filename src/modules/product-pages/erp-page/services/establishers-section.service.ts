// src/modules/product-pages/erp-page/services/establishers-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as integrationsService from '../../../home-page/services/integrations-section.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/establishers-section.repository';
import {
  CreateErpEstablisherBadgeInput,
  ErpEstablisherBadge,
  ErpEstablisherBadgeFilters,
  PublicErpEstablishersSection,
  UpdateErpEstablisherBadgeInput,
} from '../types/establishers-section.types';

const MODULE = 'erp_page';
const ENTITY = 'erp_establisher_badge';

export const list = async (
  filters: ErpEstablisherBadgeFilters,
  pagination: PaginationParams,
): Promise<{ rows: ErpEstablisherBadge[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ErpEstablisherBadge> => {
  const badge = await repo.findById(id);
  if (!badge) throw new NotFoundError('Badge');
  return badge;
};

export const create = async (
  input: CreateErpEstablisherBadgeInput,
  context: RequestContext,
): Promise<ErpEstablisherBadge> =>
  withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_ERP_ESTABLISHER_BADGES) {
      throw new ConflictError(
        `The panel holds at most ${LIMITS.MAX_ERP_ESTABLISHER_BADGES} badges - it is a two-by-two grid beside the sphere`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_ESTABLISHER_BADGE_CREATED,
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
  patch: UpdateErpEstablisherBadgeInput,
  context: RequestContext,
): Promise<ErpEstablisherBadge> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Badge');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Badge');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_ESTABLISHER_BADGE_UPDATED,
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
): Promise<ErpEstablisherBadge> => update(id, { status }, context);

/**
 * Reorder takes the complete id list, so it is idempotent and cannot leave
 * gaps. A list that omits or invents rows is rejected rather than half-applied.
 */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<ErpEstablisherBadge[]> =>
  withTransaction(async (client) => {
    const total = await repo.count(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every badge', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a badge that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_ESTABLISHER_BADGES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_ERP_ESTABLISHER_BADGES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Badge');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_ESTABLISHER_BADGE_DELETED,
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

/**
 * The website-facing read: the copy, the badges, and the sphere's logos.
 *
 * The logos come from the home page's integrations module rather than a list
 * of this section's own - the same partners, saying the same thing - so adding
 * one is a single edit that both pages pick up.
 *
 * Null when the copy is missing, or when neither panel has anything to show:
 * the page then keeps the section it ships, which is a complete working one.
 * One empty panel is allowed, because badges with no sphere, or a sphere with
 * no badges, is still a section worth rendering.
 */
export const getPublished = async (): Promise<PublicErpEstablishersSection | null> => {
  const [copy, badges, sphere] = await Promise.all([
    sectionCopyService.get('erp', 'establishers'),
    repo.findPublished(),
    integrationsService.getPublishedLogos(),
  ]);
  if (!copy) return null;
  if (badges.length === 0 && sphere.logos.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    badges: badges.map((badge) => ({
      icon: badge.icon,
      title: badge.title,
      subtext: badge.subtext,
    })),
    logos: sphere.logos,
    centreLogo: sphere.centreLogo,
  };
};
