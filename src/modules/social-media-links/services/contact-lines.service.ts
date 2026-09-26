// src/modules/social-media-links/services/contact-lines.service.ts

import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as linesRepository from '../repositories/contact-lines.repository';
import {
  CreateSocialContactLineInput,
  PublicSocialContactLine,
  SocialContactLine,
  SocialContactLineFilters,
  UpdateSocialContactLineInput,
} from '../types/contact-lines.types';
import { validateSocialContactLineValue } from '../validators/contact-lines.validator';

const MODULE = 'social_media_links';
const ENTITY = 'social_contact_line';

/** The whole row, so a deleted line's text is recoverable from the trail. */
const auditSnapshot = (line: SocialContactLine): Record<string, unknown> => ({
  kind: line.kind,
  icon: line.icon,
  value: line.value,
  status: line.status,
  displayOrder: line.displayOrder,
});

/**
 * The website-facing shape of one line.
 *
 * Exported because the footer's public read serves both lists in one response,
 * and it must narrow a line exactly the way this module does.
 */
export const toPublicContactLine = (line: SocialContactLine): PublicSocialContactLine => ({
  kind: line.kind,
  icon: line.icon,
  value: line.value,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (filters: SocialContactLineFilters): Promise<SocialContactLine[]> =>
  linesRepository.findAll(filters);

export const getById = async (id: string): Promise<SocialContactLine> => {
  const line = await linesRepository.findById(id);
  if (!line) throw new NotFoundError('Contact line');
  return line;
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateSocialContactLineInput,
  context: RequestContext,
): Promise<SocialContactLine> =>
  withTransaction(async (client) => {
    const existing = await linesRepository.count(client);
    if (existing >= LIMITS.MAX_SOCIAL_CONTACT_LINES) {
      throw new ConflictError(
        `The footer holds at most ${LIMITS.MAX_SOCIAL_CONTACT_LINES} contact lines. Delete or unpublish one first.`,
        'SOCIAL_CONTACT_LINE_LIMIT_REACHED',
      );
    }

    // Appended to the end of the list. Position is an editorial decision made
    // with the reorder arrows afterwards, not a number typed on the form.
    const displayOrder = await linesRepository.nextDisplayOrder(client);

    const line = await linesRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_CONTACT_LINE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: line.id,
        newValues: auditSnapshot(line),
      },
      context,
      client,
    );

    return line;
  });

/**
 * A partial edit of one line.
 *
 * The kind and the value are one rule, not two fields: an EMAIL line's text
 * has to be an address, a PHONE line's a dialable number. The validator checks
 * the pair when a patch carries both. When it carries only one, the other half
 * is this row's - so it is checked here, against the row read under the lock:
 *
 *   the value alone   is held to the row's CURRENT kind - otherwise 'Nashik'
 *                     could be typed into an EMAIL line and ship as a dead
 *                     mailto: link;
 *   the kind alone    re-checks the row's CURRENT value against the NEW kind -
 *                     otherwise switching an ADDRESS line to PHONE would turn
 *                     'Nashik, Maharashtra, India' into a tel: link.
 *
 * Either way the value is written back in its normalised form, so an ADDRESS
 * line whose text is 'Hello@UpWon.in' is stored lowercased the moment it
 * becomes an EMAIL line - exactly as if it had been created as one.
 */
export const update = async (
  id: string,
  patch: UpdateSocialContactLineInput,
  context: RequestContext,
): Promise<SocialContactLine> =>
  withTransaction(async (client) => {
    const existing = await linesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Contact line');

    const kindChanges = patch.kind !== undefined && patch.kind !== existing.kind;
    const checked: UpdateSocialContactLineInput =
      patch.value !== undefined || kindChanges
        ? {
            ...patch,
            value: validateSocialContactLineValue(
              patch.kind ?? existing.kind,
              patch.value ?? existing.value,
            ),
          }
        : patch;

    const saved = await linesRepository.update(id, checked, context.adminId, client);
    if (!saved) throw new NotFoundError('Contact line');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_CONTACT_LINE_UPDATED,
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
 * Publish / unpublish - the Active/Inactive control.
 *
 * Separate from update() because it is a different decision with different
 * consequences: unpublishing takes a line out of the footer on every page
 * immediately, while an edit changes its text. Keeping them apart also means
 * the audit trail says which one happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<SocialContactLine> =>
  withTransaction(async (client) => {
    const existing = await linesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Contact line');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) return existing;

    const saved = await linesRepository.updateStatus(id, status, context.adminId, client);
    if (!saved) throw new NotFoundError('Contact line');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_CONTACT_LINE_STATUS_CHANGED,
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

/**
 * Takes every line's id in its new order.
 *
 * Requiring the whole set is what makes the result a total order: a partial list
 * would renumber some rows and leave the others where they were, which produces
 * an arrangement nobody chose.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<SocialContactLine[]> =>
  withTransaction(async (client) => {
    const total = await linesRepository.count(client);
    const existingIds = await linesRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more contact lines do not exist', [
        {
          field: 'ids',
          message: `Unknown contact line ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_SOCIAL_CONTACT_LINE',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every contact line', [
        {
          field: 'ids',
          message: `Expected all ${total} contact line ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await linesRepository.applyOrder(orderedIds, context.adminId, client);

    // Recorded against the list rather than any one row: the order is a property
    // of the set.
    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_CONTACT_LINES_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Read on `client` so the list reflects the order just written.
    return linesRepository.findAll({}, client);
  });

/**
 * A hard delete.
 *
 * INACTIVE covers "not in the footer right now", so a delete means the line is
 * gone for good - the right outcome for a number that was retired or added by
 * mistake. The audit entry keeps what the line said, so the text is recoverable
 * even though the row is not.
 */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await linesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Contact line');

    await linesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_CONTACT_LINE_DELETED,
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
