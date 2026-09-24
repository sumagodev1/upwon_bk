// src/modules/product-pages/erp-page/services/journey-section.service.ts

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
import * as repo from '../repositories/journey-section.repository';
import {
  CreateErpJourneyOutcomeInput,
  CreateErpJourneyPersonaInput,
  CreateErpJourneyPointInput,
  CreateErpJourneyStatInput,
  ErpJourneyOutcome,
  ErpJourneyPersona,
  ErpJourneyPersonaFilters,
  ErpJourneyPoint,
  ErpJourneyStat,
  PublicErpJourneySection,
  ResolvedErpJourneyPersona,
  UpdateErpJourneyOutcomeInput,
  UpdateErpJourneyPersonaInput,
  UpdateErpJourneyPointInput,
  UpdateErpJourneyStatInput,
} from '../types/journey-section.types';

const MODULE = 'erp_page';
const PERSONA_ENTITY = 'erp_journey_persona';
const OUTCOME_ENTITY = 'erp_journey_outcome';
const POINT_ENTITY = 'erp_journey_point';
const STAT_ENTITY = 'erp_journey_stat';

/** Only images belong in the portrait; a PDF in an <img> is a broken frame. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the panel falls back to initials rather than
  // failing the whole request for one missing portrait.
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

const toResolved = async (
  persona: ErpJourneyPersona,
  outcomes: ErpJourneyOutcome[],
  points: ErpJourneyPoint[],
): Promise<ResolvedErpJourneyPersona> => ({
  ...persona,
  avatar: await resolveSource(persona.avatarUrl, persona.avatarFileId),
  outcomes,
  points,
});

// ── personas ──────────────────────────────────────────────────────────────

/**
 * The admin list.
 *
 * The two child lists are not attached here: the table shows one row per
 * persona and would throw the lists away, and fetching them would turn one
 * query into three for content nothing on that screen reads.
 */
export const listPersonas = async (
  filters: ErpJourneyPersonaFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedErpJourneyPersona[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllPersonas(filters, pagination);
  const resolved = await Promise.all(rows.map((row) => toResolved(row, [], [])));
  return { rows: resolved, meta: buildPaginationMeta(total, pagination) };
};

export const getPersonaById = async (id: string): Promise<ResolvedErpJourneyPersona> => {
  const persona = await repo.findPersonaById(id);
  if (!persona) throw new NotFoundError('Persona');
  const [outcomes, points] = await Promise.all([
    repo.findOutcomesByPersona(id),
    repo.findPointsByPersona(id),
  ]);
  return toResolved(persona, outcomes, points);
};

export const createPersona = async (
  input: CreateErpJourneyPersonaInput,
  context: RequestContext,
): Promise<ResolvedErpJourneyPersona> => {
  if (input.avatarFileId) {
    await assertUsableImageFile(input.avatarFileId, 'erpAvatar', 'avatarFileId');
  }

  return withTransaction(async (client) => {
    const existing = await repo.countPersonas(client);
    if (existing >= LIMITS.MAX_ERP_JOURNEY_PERSONAS) {
      throw new ConflictError(
        `The section holds at most ${LIMITS.MAX_ERP_JOURNEY_PERSONAS} audiences`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextPersonaOrder(client));
    const created = await repo.createPersona(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_PERSONA_CREATED,
        module: MODULE,
        entityType: PERSONA_ENTITY,
        entityId: created.id,
        newValues: { role: created.role, title: created.title, status: created.status },
      },
      context,
      client,
    );

    return toResolved(created, [], []);
  });
};

export const updatePersona = async (
  id: string,
  patch: UpdateErpJourneyPersonaInput,
  context: RequestContext,
): Promise<ResolvedErpJourneyPersona> => {
  if (patch.avatarFileId) {
    await assertUsableImageFile(patch.avatarFileId, 'erpAvatar', 'avatarFileId');
  }

  return withTransaction(async (client) => {
    const existing = await repo.findPersonaByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Persona');

    /*
     * The metric is one of two forms and the CHECK enforces exactly one. A
     * patch that clears the form currently in use without supplying the other
     * would leave the row with neither, so it is caught here - where the stored
     * row is visible - rather than as a raw constraint violation.
     */
    const countToAfter =
      patch.metricCountTo !== undefined ? patch.metricCountTo : existing.metricCountTo;
    const textAfter = patch.metricText !== undefined ? patch.metricText : existing.metricText;
    if (countToAfter === null && textAfter === null) {
      throw new ValidationError('The metric cannot be empty', [
        {
          field: 'metricCountTo',
          message:
            'Give the metric either as a number to count up to or as text - clearing both would leave the panel with no figure',
          code: 'REQUIRED',
        },
      ]);
    }

    const updated = await repo.updatePersona(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Persona');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_PERSONA_UPDATED,
        module: MODULE,
        entityType: PERSONA_ENTITY,
        entityId: id,
        oldValues: { role: existing.role, title: existing.title, status: existing.status },
        newValues: { role: updated.role, title: updated.title, status: updated.status },
      },
      context,
      client,
    );

    const [outcomes, points] = await Promise.all([
      repo.findOutcomesByPersona(id, client),
      repo.findPointsByPersona(id, client),
    ]);
    return toResolved(updated, outcomes, points);
  });
};

export const setPersonaStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedErpJourneyPersona> =>
  withTransaction(async (client) => {
    const existing = await repo.findPersonaByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Persona');

    const updated = await repo.updatePersonaStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Persona');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_PERSONA_UPDATED,
        module: MODULE,
        entityType: PERSONA_ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    const [outcomes, points] = await Promise.all([
      repo.findOutcomesByPersona(id, client),
      repo.findPointsByPersona(id, client),
    ]);
    return toResolved(updated, outcomes, points);
  });

/**
 * Reorder takes the complete id list, so it is idempotent and cannot leave
 * gaps. A list that omits or invents rows is rejected rather than half-applied.
 */
export const reorderPersonas = async (
  ids: string[],
  context: RequestContext,
): Promise<ResolvedErpJourneyPersona[]> =>
  withTransaction(async (client) => {
    const current = await repo.findAllPersonas(
      {},
      { page: 1, limit: LIMITS.MAX_ERP_JOURNEY_PERSONAS, offset: 0 },
      client,
    );

    if (ids.length !== current.total) {
      throw new ValidationError('The order must list every audience', [
        {
          field: 'ids',
          message: `Expected ${current.total} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingPersonaIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names an audience that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyPersonaOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_PERSONAS_REORDERED,
        module: MODULE,
        entityType: PERSONA_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    const reordered = await repo.findAllPersonas(
      {},
      { page: 1, limit: LIMITS.MAX_ERP_JOURNEY_PERSONAS, offset: 0 },
      client,
    );
    return Promise.all(reordered.rows.map((row) => toResolved(row, [], [])));
  });

export const removePersona = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findPersonaByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Persona');

    // The outcomes and points go with it; both tables cascade on delete.
    await repo.removePersona(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_PERSONA_DELETED,
        module: MODULE,
        entityType: PERSONA_ENTITY,
        entityId: id,
        oldValues: { role: existing.role, title: existing.title },
      },
      context,
      client,
    );
  });
};

// ── the two child lists ───────────────────────────────────────────────────

/**
 * Both lists are addressed through their persona, so the persona in the path is
 * checked rather than trusted. Without it the nesting would be decoration: any
 * id would resolve under any parent, and a screen could delete a row belonging
 * to an audience the editor is not even looking at.
 *
 * A mismatch reads as "no such row here", not as a permission error - the row
 * genuinely is not at that address.
 */
const assertOwned = <T extends { personaId: string }>(
  row: T | null,
  personaId: string,
  label: string,
): T => {
  if (!row || row.personaId !== personaId) throw new NotFoundError(label);
  return row;
};

const assertPersonaExists = async (personaId: string): Promise<void> => {
  const persona = await repo.findPersonaById(personaId);
  if (!persona) throw new NotFoundError('Persona');
};

// ── measurable outcomes ───────────────────────────────────────────────────

export const listOutcomes = async (personaId: string): Promise<ErpJourneyOutcome[]> => {
  await assertPersonaExists(personaId);
  return repo.findOutcomesByPersona(personaId);
};

export const getOutcomeById = async (
  personaId: string,
  id: string,
): Promise<ErpJourneyOutcome> =>
  assertOwned(await repo.findOutcomeById(id), personaId, 'Outcome');

export const createOutcome = async (
  personaId: string,
  input: CreateErpJourneyOutcomeInput,
  context: RequestContext,
): Promise<ErpJourneyOutcome> =>
  withTransaction(async (client) => {
    const persona = await repo.findPersonaById(personaId, client);
    if (!persona) throw new NotFoundError('Persona');

    const existing = await repo.countOutcomes(personaId, client);
    if (existing >= LIMITS.MAX_ERP_JOURNEY_OUTCOMES) {
      throw new ConflictError(
        `An audience holds at most ${LIMITS.MAX_ERP_JOURNEY_OUTCOMES} measurable outcomes`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextOutcomeOrder(personaId, client));
    const created = await repo.createOutcome(
      personaId,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_OUTCOME_CREATED,
        module: MODULE,
        entityType: OUTCOME_ENTITY,
        entityId: created.id,
        newValues: { personaId, text: created.text, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateOutcome = async (
  personaId: string,
  id: string,
  patch: UpdateErpJourneyOutcomeInput,
  context: RequestContext,
): Promise<ErpJourneyOutcome> =>
  withTransaction(async (client) => {
    const existing = assertOwned(
      await repo.findOutcomeByIdForUpdate(id, client),
      personaId,
      'Outcome',
    );

    const updated = await repo.updateOutcome(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Outcome');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_OUTCOME_UPDATED,
        module: MODULE,
        entityType: OUTCOME_ENTITY,
        entityId: id,
        oldValues: { text: existing.text, status: existing.status },
        newValues: { text: updated.text, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setOutcomeStatus = async (
  personaId: string,
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ErpJourneyOutcome> => updateOutcome(personaId, id, { status }, context);

export const reorderOutcomes = async (
  personaId: string,
  ids: string[],
  context: RequestContext,
): Promise<ErpJourneyOutcome[]> =>
  withTransaction(async (client) => {
    const persona = await repo.findPersonaById(personaId, client);
    if (!persona) throw new NotFoundError('Persona');

    const current = await repo.findOutcomesByPersona(personaId, client);
    if (ids.length !== current.length) {
      throw new ValidationError('The order must list every outcome', [
        {
          field: 'ids',
          message: `Expected ${current.length} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    // Every id has to belong to this persona, so a reorder cannot reach across
    // audiences and quietly renumber someone else's list.
    const owned = new Set(current.map((row) => row.id));
    if (!ids.every((id) => owned.has(id))) {
      throw new ValidationError('The order names an outcome from another audience', [
        { field: 'ids', message: 'One or more ids are unknown here', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyOutcomeOrder(personaId, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_OUTCOMES_REORDERED,
        module: MODULE,
        entityType: OUTCOME_ENTITY,
        entityId: personaId,
        newValues: { order: ids },
      },
      context,
      client,
    );

    return repo.findOutcomesByPersona(personaId, client);
  });

export const removeOutcome = async (
  personaId: string,
  id: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = assertOwned(
      await repo.findOutcomeByIdForUpdate(id, client),
      personaId,
      'Outcome',
    );

    await repo.removeOutcome(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_OUTCOME_DELETED,
        module: MODULE,
        entityType: OUTCOME_ENTITY,
        entityId: id,
        oldValues: { personaId, text: existing.text },
      },
      context,
      client,
    );
  });
};

// ── beyond the numbers ────────────────────────────────────────────────────

export const listPoints = async (personaId: string): Promise<ErpJourneyPoint[]> => {
  await assertPersonaExists(personaId);
  return repo.findPointsByPersona(personaId);
};

export const getPointById = async (personaId: string, id: string): Promise<ErpJourneyPoint> =>
  assertOwned(await repo.findPointById(id), personaId, 'Point');

export const createPoint = async (
  personaId: string,
  input: CreateErpJourneyPointInput,
  context: RequestContext,
): Promise<ErpJourneyPoint> =>
  withTransaction(async (client) => {
    const persona = await repo.findPersonaById(personaId, client);
    if (!persona) throw new NotFoundError('Persona');

    const existing = await repo.countPoints(personaId, client);
    if (existing >= LIMITS.MAX_ERP_JOURNEY_POINTS) {
      throw new ConflictError(
        `An audience holds at most ${LIMITS.MAX_ERP_JOURNEY_POINTS} points`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextPointOrder(personaId, client));
    const created = await repo.createPoint(
      personaId,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_POINT_CREATED,
        module: MODULE,
        entityType: POINT_ENTITY,
        entityId: created.id,
        newValues: { personaId, text: created.text, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updatePoint = async (
  personaId: string,
  id: string,
  patch: UpdateErpJourneyPointInput,
  context: RequestContext,
): Promise<ErpJourneyPoint> =>
  withTransaction(async (client) => {
    const existing = assertOwned(
      await repo.findPointByIdForUpdate(id, client),
      personaId,
      'Point',
    );

    const updated = await repo.updatePoint(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Point');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_POINT_UPDATED,
        module: MODULE,
        entityType: POINT_ENTITY,
        entityId: id,
        oldValues: { text: existing.text, status: existing.status },
        newValues: { text: updated.text, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setPointStatus = async (
  personaId: string,
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ErpJourneyPoint> => updatePoint(personaId, id, { status }, context);

export const reorderPoints = async (
  personaId: string,
  ids: string[],
  context: RequestContext,
): Promise<ErpJourneyPoint[]> =>
  withTransaction(async (client) => {
    const persona = await repo.findPersonaById(personaId, client);
    if (!persona) throw new NotFoundError('Persona');

    const current = await repo.findPointsByPersona(personaId, client);
    if (ids.length !== current.length) {
      throw new ValidationError('The order must list every point', [
        {
          field: 'ids',
          message: `Expected ${current.length} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const owned = new Set(current.map((row) => row.id));
    if (!ids.every((id) => owned.has(id))) {
      throw new ValidationError('The order names a point from another audience', [
        { field: 'ids', message: 'One or more ids are unknown here', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyPointOrder(personaId, ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_POINTS_REORDERED,
        module: MODULE,
        entityType: POINT_ENTITY,
        entityId: personaId,
        newValues: { order: ids },
      },
      context,
      client,
    );

    return repo.findPointsByPersona(personaId, client);
  });

export const removePoint = async (
  personaId: string,
  id: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = assertOwned(
      await repo.findPointByIdForUpdate(id, client),
      personaId,
      'Point',
    );

    await repo.removePoint(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_POINT_DELETED,
        module: MODULE,
        entityType: POINT_ENTITY,
        entityId: id,
        oldValues: { personaId, text: existing.text },
      },
      context,
      client,
    );
  });
};

// ── company-wide statistics ───────────────────────────────────────────────

export const listStats = async (): Promise<ErpJourneyStat[]> => repo.findAllStats();

export const getStatById = async (id: string): Promise<ErpJourneyStat> => {
  const stat = await repo.findStatById(id);
  if (!stat) throw new NotFoundError('Statistic');
  return stat;
};

export const createStat = async (
  input: CreateErpJourneyStatInput,
  context: RequestContext,
): Promise<ErpJourneyStat> =>
  withTransaction(async (client) => {
    const existing = await repo.countStats(client);
    if (existing >= LIMITS.MAX_ERP_JOURNEY_STATS) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_ERP_JOURNEY_STATS} statistics alongside the audience's own figure`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextStatOrder(client));
    const created = await repo.createStat({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_STAT_CREATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: created.id,
        newValues: { value: created.value, label: created.label, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

export const updateStat = async (
  id: string,
  patch: UpdateErpJourneyStatInput,
  context: RequestContext,
): Promise<ErpJourneyStat> =>
  withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    const updated = await repo.updateStat(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Statistic');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_STAT_UPDATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: id,
        oldValues: { value: existing.value, label: existing.label, status: existing.status },
        newValues: { value: updated.value, label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setStatStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ErpJourneyStat> => updateStat(id, { status }, context);

export const reorderStats = async (
  ids: string[],
  context: RequestContext,
): Promise<ErpJourneyStat[]> =>
  withTransaction(async (client) => {
    const current = await repo.findAllStats(client);
    if (ids.length !== current.length) {
      throw new ValidationError('The order must list every statistic', [
        {
          field: 'ids',
          message: `Expected ${current.length} ids, got ${ids.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    const existing = await repo.findExistingStatIds(ids, client);
    if (existing.length !== ids.length) {
      throw new ValidationError('The order names a statistic that does not exist', [
        { field: 'ids', message: 'One or more ids are unknown', code: 'UNKNOWN_ID' },
      ]);
    }

    await repo.applyStatOrder(ids, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_STATS_REORDERED,
        module: MODULE,
        entityType: STAT_ENTITY,
        newValues: { order: ids },
      },
      context,
      client,
    );

    return repo.findAllStats(client);
  });

export const removeStat = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Statistic');

    await repo.removeStat(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ERP_JOURNEY_STAT_DELETED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: id,
        oldValues: { value: existing.value, label: existing.label },
      },
      context,
      client,
    );
  });
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * The whole section in one response.
 *
 * The site swaps panels in the browser as the pointer moves down the audience
 * list, so sending personas one at a time would mean a request per hover for
 * content already known - and a visible stall. Null when the copy or the
 * personas are missing: the page then keeps the section it ships, which is a
 * complete working one.
 *
 * Both child lists are fetched in one query each rather than per persona, so
 * this is four round trips whatever the number of audiences.
 */
export const getPublished = async (): Promise<PublicErpJourneySection | null> => {
  const [copy, personas, stats] = await Promise.all([
    sectionCopyService.get('erp', 'benefits'),
    repo.findPublishedPersonas(),
    repo.findPublishedStats(),
  ]);
  if (!copy || personas.length === 0) return null;

  const ids = personas.map((persona) => persona.id);
  const [outcomes, points] = await Promise.all([
    repo.findActiveOutcomesForPersonas(ids),
    repo.findActivePointsForPersonas(ids),
  ]);

  const outcomesBy = new Map<string, ErpJourneyOutcome[]>();
  for (const outcome of outcomes) {
    const list = outcomesBy.get(outcome.personaId) ?? [];
    list.push(outcome);
    outcomesBy.set(outcome.personaId, list);
  }

  const pointsBy = new Map<string, ErpJourneyPoint[]>();
  for (const point of points) {
    const list = pointsBy.get(point.personaId) ?? [];
    list.push(point);
    pointsBy.set(point.personaId, list);
  }

  const rendered = await Promise.all(
    personas.map(async (persona) => ({
      // Composed here so the sentence pattern stays out of the website
      // component, which then only prints what it is handed.
      eyebrow: `For the ${persona.role} · ${persona.context}`,
      title: persona.title,
      description: persona.description,
      metric: {
        countTo: persona.metricCountTo,
        text: persona.metricText,
        prefix: persona.metricPrefix,
        suffix: persona.metricSuffix,
      },
      metricLabel: persona.metricLabel,
      authorDesignation: persona.authorDesignation,
      authorCompany: persona.authorCompany,
      avatar: await resolveSource(persona.avatarUrl, persona.avatarFileId),
      avatarAlt: persona.avatarAlt,
      avatarColor: persona.avatarColor,
      outcomes: (outcomesBy.get(persona.id) ?? []).map((outcome) => ({
        text: outcome.text,
        icon: outcome.icon,
      })),
      points: (pointsBy.get(persona.id) ?? []).map((point) => point.text),
    })),
  );

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    personas: rendered,
    stats: stats.map((stat) => ({
      // The prefix and suffix are joined here so the site prints one string;
      // most rows carry neither and read exactly as typed.
      value: `${stat.prefix ?? ''}${stat.value}${stat.suffix ?? ''}`,
      label: stat.label,
    })),
  };
};
