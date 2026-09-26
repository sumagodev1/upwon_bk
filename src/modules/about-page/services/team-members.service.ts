// src/modules/about-page/services/team-members.service.ts

import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as membersRepository from '../repositories/team-members.repository';
import {
  AboutTeamMember,
  AboutTeamMemberFilters,
  CreateAboutTeamMemberInput,
  PublicAboutTeamMember,
  ResolvedAboutTeamMember,
  UpdateAboutTeamMemberInput,
} from '../types/team.types';
import { ABOUT_IMAGE_SPECS } from '../utils/about-image-spec';

const MODULE = 'about_page';
const ENTITY = 'about_team_member';

/** The whole row, so a deleted person's copy is recoverable from the trail. */
const auditSnapshot = (member: AboutTeamMember): Record<string, unknown> => ({
  name: member.name,
  role: member.role,
  meta: member.meta,
  photoUrl: member.photoUrl,
  photoFileId: member.photoFileId,
  status: member.status,
  displayOrder: member.displayOrder,
});

const toResolved = async (member: AboutTeamMember): Promise<ResolvedAboutTeamMember> => ({
  ...member,
  photo: await resolveImageSource(member.photoUrl, member.photoFileId),
});

/**
 * The website-facing shape of one person.
 *
 * Exported because the team SECTION's public read embeds the people - the page
 * renders them as one band - and both halves must narrow a person the same way.
 */
export const toPublicMember = async (
  member: AboutTeamMember,
): Promise<PublicAboutTeamMember> => {
  const photo = await resolveImageSource(member.photoUrl, member.photoFileId);
  return {
    name: member.name,
    role: member.role,
    meta: member.meta,
    photo,
    // Not authored: the name and role stand in. The monogram the card falls back
    // to when photo is null is the site's own derivation - see the founder note
    // service for why no initials are returned.
    photoAlt: photo ? `${member.name}, ${member.role}` : null,
  };
};

/** Rejects an uploaded portrait that cannot serve the circle it renders into. */
const assertUsablePhoto = async (
  input: { photoFileId?: string | null },
): Promise<void> => {
  if (!input.photoFileId) return;
  await assertUsableImageFile(input.photoFileId, ABOUT_IMAGE_SPECS.portrait, 'photoFileId');
};

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (
  filters: AboutTeamMemberFilters,
): Promise<ResolvedAboutTeamMember[]> => {
  const members = await membersRepository.findAll(filters);
  return Promise.all(members.map(toResolved));
};

export const getById = async (id: string): Promise<ResolvedAboutTeamMember> => {
  const member = await membersRepository.findById(id);
  if (!member) throw new NotFoundError('Team member');
  return toResolved(member);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateAboutTeamMemberInput,
  context: RequestContext,
): Promise<ResolvedAboutTeamMember> => {
  await assertUsablePhoto(input);

  const created = await withTransaction(async (client) => {
    const existing = await membersRepository.count(client);
    if (existing >= LIMITS.MAX_ABOUT_TEAM_MEMBERS) {
      throw new ConflictError(
        `The People section holds at most ${LIMITS.MAX_ABOUT_TEAM_MEMBERS} people. Delete or unpublish one first.`,
        'TEAM_MEMBER_LIMIT_REACHED',
      );
    }

    // Appended to the end of the grid. Position is an editorial decision made
    // with the reorder arrows afterwards, not a number typed on the form.
    const displayOrder = await membersRepository.nextDisplayOrder(client);

    const member = await membersRepository.create(
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_TEAM_MEMBER_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: member.id,
        newValues: auditSnapshot(member),
      },
      context,
      client,
    );

    return member;
  });

  return toResolved(created);
};

export const update = async (
  id: string,
  patch: UpdateAboutTeamMemberInput,
  context: RequestContext,
): Promise<ResolvedAboutTeamMember> => {
  await assertUsablePhoto(patch);

  const updated = await withTransaction(async (client) => {
    const existing = await membersRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Team member');

    const saved = await membersRepository.update(id, patch, context.adminId, client);
    if (!saved) throw new NotFoundError('Team member');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_TEAM_MEMBER_UPDATED,
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

  return toResolved(updated);
};

/**
 * Publish / unpublish - the Active/Inactive control.
 *
 * Separate from update() because it is a different decision with different
 * consequences: unpublishing takes a person off the public page immediately,
 * while an edit changes copy. Keeping them apart also means the audit trail says
 * which one happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedAboutTeamMember> => {
  const member = await withTransaction(async (client) => {
    const existing = await membersRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Team member');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) return existing;

    const saved = await membersRepository.updateStatus(id, status, context.adminId, client);
    if (!saved) throw new NotFoundError('Team member');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_TEAM_MEMBER_STATUS_CHANGED,
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

  return toResolved(member);
};

/**
 * Takes every person's id in their new order.
 *
 * Requiring the whole set is what makes the result a total order: a partial list
 * would renumber some rows and leave the others where they were, which produces
 * an arrangement nobody chose.
 */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedAboutTeamMember[]> => {
  const members = await withTransaction(async (client) => {
    const total = await membersRepository.count(client);
    const existingIds = await membersRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more people do not exist', [
        {
          field: 'ids',
          message: `Unknown team member ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_TEAM_MEMBER',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every person', [
        {
          field: 'ids',
          message: `Expected all ${total} team member ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await membersRepository.applyOrder(orderedIds, context.adminId, client);

    // Recorded against the list rather than any one row: the order is a property
    // of the set.
    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_TEAM_MEMBERS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Read on `client` so the list reflects the order just written.
    return membersRepository.findAll({}, client);
  });

  return Promise.all(members.map(toResolved));
};

/**
 * A hard delete.
 *
 * INACTIVE covers "not on the page right now", so a delete means the person is
 * gone for good - which is the right outcome when somebody was added by mistake
 * or has left. The audit entry keeps what the card said, so the copy is
 * recoverable even though the row is not.
 */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await membersRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Team member');

    await membersRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_TEAM_MEMBER_DELETED,
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
