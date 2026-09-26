// src/modules/careers/services/vacancies.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as applicationsRepository from '../repositories/applications.repository';
import * as vacanciesRepository from '../repositories/vacancies.repository';
import {
  CareerVacancy,
  CareerVacancyFilters,
  CareerVacancySummary,
  CreateCareerVacancyInput,
  PublicCareerVacancy,
  UpdateCareerVacancyInput,
} from '../types/vacancies.types';

const MODULE = 'careers';
const ENTITY = 'career_vacancy';

/** The fields an audit entry records - the whole row, so copy is recoverable. */
const auditSnapshot = (vacancy: CareerVacancy): Record<string, unknown> => ({
  title: vacancy.title,
  department: vacancy.department,
  location: vacancy.location,
  workMode: vacancy.workMode,
  description: vacancy.description,
  requirements: vacancy.requirements,
  skills: vacancy.skills,
  experience: vacancy.experience,
  status: vacancy.status,
  displayOrder: vacancy.displayOrder,
});

/** The website-facing shape: everything the details popup renders, no more. */
const toPublic = (vacancy: CareerVacancy): PublicCareerVacancy => ({
  id: vacancy.id,
  title: vacancy.title,
  department: vacancy.department,
  location: vacancy.location,
  workMode: vacancy.workMode,
  experience: vacancy.experience,
  description: vacancy.description,
  requirements: vacancy.requirements,
  skills: vacancy.skills,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: CareerVacancyFilters,
): Promise<CareerVacancySummary[]> => vacanciesRepository.findAll(filters);

export const getById = async (id: string): Promise<CareerVacancySummary> => {
  const vacancy = await vacanciesRepository.findById(id);
  if (!vacancy) throw new NotFoundError('Vacancy');
  return vacancy;
};

/**
 * The public Open Roles list.
 *
 * An empty array is a legal answer, not a 404: "we are not hiring right now"
 * is a true statement about a page that still exists, and the website renders
 * its own copy for it. That is different from the singleton sections, where
 * nothing authored means the site should fall back to its static content.
 */
export const listPublished = async (): Promise<PublicCareerVacancy[]> => {
  const vacancies = await vacanciesRepository.findPublished();
  return vacancies.map(toPublic);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateCareerVacancyInput,
  context: RequestContext,
): Promise<CareerVacancySummary> => {
  const created = await withTransaction(async (client) => {
    const existing = await vacanciesRepository.count(client);
    if (existing >= LIMITS.MAX_VACANCIES) {
      throw new ConflictError(
        `The Careers page holds at most ${LIMITS.MAX_VACANCIES} vacancies. Delete or unpublish one first.`,
        'VACANCY_LIMIT_REACHED',
      );
    }

    // Appended to the end of the list. Position is an editorial decision made
    // with the reorder arrows afterwards, not a number typed on the form.
    const displayOrder = await vacanciesRepository.nextDisplayOrder(client);

    const vacancy = await vacanciesRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CAREER_VACANCY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: vacancy.id,
        newValues: auditSnapshot(vacancy),
      },
      context,
      client,
    );

    return vacancy;
  });

  return { ...created, applicationCount: 0 };
};

export const update = async (
  id: string,
  patch: UpdateCareerVacancyInput,
  context: RequestContext,
): Promise<CareerVacancySummary> => {
  await withTransaction(async (client) => {
    const existing = await vacanciesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Vacancy');

    const updated = await vacanciesRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Vacancy');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CAREER_VACANCY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
        newValues: auditSnapshot(updated),
      },
      context,
      client,
    );
  });

  // Re-read for the application count, which the admin table shows beside
  // every row and which an update never changes.
  return getById(id);
};

/**
 * Publish / unpublish - the Active/Inactive control.
 *
 * Separate from update() because it is a different decision with different
 * consequences: unpublishing takes a role off the public page immediately,
 * while an edit changes copy. Keeping them apart also means the audit trail
 * says which one happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<CareerVacancySummary> => {
  await withTransaction(async (client) => {
    const existing = await vacanciesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Vacancy');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) return;

    const updated = await vacanciesRepository.updateStatus(
      id,
      status,
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('Vacancy');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CAREER_VACANCY_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );
  });

  return getById(id);
};

/**
 * Takes every vacancy id in its new order.
 *
 * Requiring the whole set is what makes the result a total order: a partial
 * list would renumber some rows and leave the others where they were, which
 * produces an arrangement nobody chose.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<CareerVacancySummary[]> =>
  withTransaction(async (client) => {
    const total = await vacanciesRepository.count(client);
    const existingIds = await vacanciesRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more vacancies do not exist', [
        {
          field: 'ids',
          message: `Unknown vacancy ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_VACANCY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every vacancy', [
        {
          field: 'ids',
          message: `Expected all ${total} vacancy ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await vacanciesRepository.applyOrder(orderedIds, context.adminId, client);

    // Recorded against the list rather than any one row: the order is a
    // property of the set.
    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CAREER_VACANCIES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Read on `client` so the list reflects the order just written.
    return vacanciesRepository.findAll({}, client);
  });

/**
 * Deletes a vacancy and reports how many applications outlived it.
 *
 * The applications are NOT deleted. career_applications.vacancy_id is ON
 * DELETE SET NULL and every row carries the title it was advertised under, so
 * the inbox keeps reading correctly with the role marked as gone. A recruiter
 * tidying up last quarter's roles must not silently destroy the people who
 * applied for them, and the returned count is what the response message and
 * the admin's confirmation dialog say out loud.
 */
export const remove = async (
  id: string,
  context: RequestContext,
): Promise<{ applicationsRetained: number }> =>
  withTransaction(async (client) => {
    const existing = await vacanciesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Vacancy');

    // Counted before the delete, while the rows still point at this vacancy.
    const applicationsRetained = await applicationsRepository.countByVacancy(id, client);

    await vacanciesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CAREER_VACANCY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: { ...auditSnapshot(existing), applicationsRetained },
      },
      context,
      client,
    );

    return { applicationsRetained };
  });
