// src/modules/about-page/services/number-stats.service.ts

import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as statsRepository from '../repositories/number-stats.repository';
import {
  AboutNumberStat,
  AboutNumberStatFilters,
  CreateAboutNumberStatInput,
  PublicAboutNumberStat,
  UpdateAboutNumberStatInput,
} from '../types/numbers.types';

const MODULE = 'about_page';
const ENTITY = 'about_number_stat';

/** The whole row, so a deleted card's copy is recoverable from the trail. */
const auditSnapshot = (stat: AboutNumberStat): Record<string, unknown> => ({
  value: stat.value,
  label: stat.label,
  description: stat.description,
  status: stat.status,
  displayOrder: stat.displayOrder,
});

/**
 * The website-facing shape of one card.
 *
 * Exported because the Number SECTION's public read embeds the cards - the page
 * renders them as one band - and both halves must narrow a card the same way.
 * Synchronous, unlike the team's: a stat has no image to resolve.
 */
export const toPublicStat = (stat: AboutNumberStat): PublicAboutNumberStat => ({
  value: stat.value,
  label: stat.label,
  description: stat.description,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (filters: AboutNumberStatFilters): Promise<AboutNumberStat[]> =>
  statsRepository.findAll(filters);

export const getById = async (id: string): Promise<AboutNumberStat> => {
  const stat = await statsRepository.findById(id);
  if (!stat) throw new NotFoundError('Stat card');
  return stat;
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateAboutNumberStatInput,
  context: RequestContext,
): Promise<AboutNumberStat> =>
  withTransaction(async (client) => {
    const existing = await statsRepository.count(client);
    if (existing >= LIMITS.MAX_ABOUT_NUMBER_STATS) {
      throw new ConflictError(
        `The Number section holds at most ${LIMITS.MAX_ABOUT_NUMBER_STATS} cards. Delete or unpublish one first.`,
        'NUMBER_STAT_LIMIT_REACHED',
      );
    }

    // Appended to the end of the row. Position is an editorial decision made
    // with the reorder arrows afterwards, not a number typed on the form.
    const displayOrder = await statsRepository.nextDisplayOrder(client);

    const stat = await statsRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_NUMBER_STAT_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: stat.id,
        newValues: auditSnapshot(stat),
      },
      context,
      client,
    );

    return stat;
  });

export const update = async (
  id: string,
  patch: UpdateAboutNumberStatInput,
  context: RequestContext,
): Promise<AboutNumberStat> =>
  withTransaction(async (client) => {
    const existing = await statsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Stat card');

    const saved = await statsRepository.update(id, patch, context.adminId, client);
    if (!saved) throw new NotFoundError('Stat card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_NUMBER_STAT_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
        newValues: auditSnapshot(saved),
      },
      context,
      client,
    );

    return saved;
  });

/**
 * Publish / unpublish - the Active/Inactive control. Separate from update() for
 * the reason the team member's is: different decision, different consequence,
 * and the trail should say which one happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<AboutNumberStat> =>
  withTransaction(async (client) => {
    const existing = await statsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Stat card');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) return existing;

    const saved = await statsRepository.updateStatus(id, status, context.adminId, client);
    if (!saved) throw new NotFoundError('Stat card');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_NUMBER_STAT_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: saved.status },
      },
      context,
      client,
    );

    return saved;
  });

/** Takes every card's id in its new order - see the team members service. */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<AboutNumberStat[]> =>
  withTransaction(async (client) => {
    const total = await statsRepository.count(client);
    const existingIds = await statsRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more stat cards do not exist', [
        {
          field: 'ids',
          message: `Unknown stat ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_NUMBER_STAT',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every stat card', [
        {
          field: 'ids',
          message: `Expected all ${total} stat ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await statsRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_NUMBER_STATS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Read on `client` so the list reflects the order just written.
    return statsRepository.findAll({}, client);
  });

/** A hard delete; INACTIVE covers "not on the page right now". */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await statsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Stat card');

    await statsRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_NUMBER_STAT_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
