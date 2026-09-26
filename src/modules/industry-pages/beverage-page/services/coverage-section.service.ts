// src/modules/industry-pages/beverage-page/services/coverage-section.service.ts

import { withTransaction } from '../../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../../config/constants';
import { ConflictError } from '../../../../core/errors/ConflictError';
import { NotFoundError } from '../../../../core/errors/NotFoundError';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../../core/utils/pagination';
import * as auditLogService from '../../../audit-logs/services/audit-log.service';
import * as sectionCopyService from '../../../home-page/services/section-copy.service';
import * as repo from '../repositories/coverage-section.repository';
import {
  BeverageCoverageCategory,
  BeverageCoverageCategoryFilters,
  CreateBeverageCoverageCategoryInput,
  PublicBeverageCoverageSection,
  UpdateBeverageCoverageCategoryInput,
} from '../types/coverage-section.types';

const MODULE = 'beverage_page';
const ENTITY = 'beverage_coverage_category';

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: BeverageCoverageCategoryFilters,
  pagination: PaginationParams,
): Promise<{ rows: BeverageCoverageCategory[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<BeverageCoverageCategory> => {
  const category = await repo.findById(id);
  if (!category) throw new NotFoundError('Category');
  return category;
};

/**
 * The website-facing read: the copy and every active category, in order.
 *
 * Null when the copy is missing or nothing is active - the site treats that as
 * "keep the built-in section", the same as an unreachable API.
 */
export const getPublished = async (): Promise<PublicBeverageCoverageSection | null> => {
  const [copy, categories] = await Promise.all([
    sectionCopyService.get('beverage', 'coverage'),
    repo.findPublished(),
  ]);
  if (!copy || categories.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    categories: categories.map((category) => ({
      label: category.label,
      detail: category.detail,
      icon: category.icon,
    })),
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateBeverageCoverageCategoryInput,
  context: RequestContext,
): Promise<BeverageCoverageCategory> =>
  withTransaction(async (client) => {
    const existing = await repo.countAll(client);
    if (existing >= LIMITS.MAX_BEVERAGE_COVERAGE_CATEGORIES) {
      throw new ConflictError(
        `The grid holds at most ${LIMITS.MAX_BEVERAGE_COVERAGE_CATEGORIES} categories. Delete one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextDisplayOrder(client));
    const created = await repo.create({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BEVERAGE_COVERAGE_CATEGORY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: { label: created.label, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const update = async (
  id: string,
  patch: UpdateBeverageCoverageCategoryInput,
  context: RequestContext,
): Promise<BeverageCoverageCategory> =>
  withTransaction(async (client) => {
    const existing = await repo.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Category');

    const updated = await repo.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Category');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BEVERAGE_COVERAGE_CATEGORY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { label: existing.label, status: existing.status },
        newValues: { label: updated.label, status: updated.status },
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
): Promise<BeverageCoverageCategory> => update(id, { status }, context);

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorder = async (
  ids: string[],
  context: RequestContext,
): Promise<BeverageCoverageCategory[]> =>
  withTransaction(async (client) => {
    const total = await repo.countAll(client);

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
        action: AUDIT_ACTIONS.BEVERAGE_COVERAGE_CATEGORIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAll(
      {},
      { page: 1, limit: LIMITS.MAX_BEVERAGE_COVERAGE_CATEGORIES, offset: 0 },
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
        action: AUDIT_ACTIONS.BEVERAGE_COVERAGE_CATEGORY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { label: existing.label },
      },
      context,
      client,
    );
  });
};
