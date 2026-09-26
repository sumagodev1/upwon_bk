// src/modules/product-pages/pos-page/services/recognition-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/recognition-section.repository';
import {
  CreatePosRecognitionCategoryInput,
  PosRecognitionCategory,
  PosRecognitionCategoryFilters,
  PublicPosRecognitionSection,
  UpdatePosRecognitionCategoryInput,
} from '../types/recognition-section.types';

const MODULE = 'pos_page';
const ENTITY = 'pos_recognition_category';

export const list = async (
  filters: PosRecognitionCategoryFilters,
  pagination: PaginationParams,
): Promise<{ rows: PosRecognitionCategory[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<PosRecognitionCategory> => {
  const category = await repo.findById(id);
  if (!category) throw new NotFoundError('Category');
  return category;
};

export const create = async (
  input: CreatePosRecognitionCategoryInput,
  context: RequestContext,
): Promise<PosRecognitionCategory> =>
  withTransaction(async (client) => {
    const existing = await repo.count(client);
    if (existing >= LIMITS.MAX_POS_RECOGNITION_CATEGORIES) {
      throw new ConflictError(
        `The map holds at most ${LIMITS.MAX_POS_RECOGNITION_CATEGORIES} categories`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_RECOGNITION_CATEGORY_CREATED,
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
  patch: UpdatePosRecognitionCategoryInput,
  context: RequestContext,
): Promise<PosRecognitionCategory> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_RECOGNITION_CATEGORY_UPDATED,
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
): Promise<PosRecognitionCategory> => update(id, { status }, context);

export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<PosRecognitionCategory[]> =>
  withTransaction(async (client) => {
    const total = await repo.count(client);

    if (ids.length !== total) {
      throw new ValidationError('The order must list every category', [
        {
          field: 'ids',
          message: `Expected ${total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a category that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_RECOGNITION_CATEGORIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_POS_RECOGNITION_CATEGORIES, offset: 0 },
      client,
    );
    return reordered.rows;
  });

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    await repo.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.POS_RECOGNITION_CATEGORY_DELETED,
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

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one call: the copy on the left and the cards on the
 * right.
 *
 * Null when the copy is missing or no card is published - the page then keeps
 * the map it ships, which is a complete working one. Unlike the proof strip,
 * there is no "one panel empty is still fine" case here: a heading with an
 * empty grid beside it is not a section, it is a hole.
 */
export const getPublished = async (): Promise<PublicPosRecognitionSection | null> => {
  const [copy, categories] = await Promise.all([
    sectionCopyService.get('pos', 'recognition'),
    repo.findPublished(),
  ]);
  if (!copy || categories.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    categories: categories.map((category) => ({
      icon: category.icon,
      title: category.title,
      description: category.description,
    })),
  };
};
