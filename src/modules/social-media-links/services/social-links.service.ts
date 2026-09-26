// src/modules/social-media-links/services/social-links.service.ts

import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as linksRepository from '../repositories/social-links.repository';
import {
  CreateSocialLinkInput,
  PublicSocialLink,
  SocialLink,
  SocialLinkFilters,
  UpdateSocialLinkInput,
} from '../types/social-links.types';
import { socialLinkLabel } from '../utils/icons';

const MODULE = 'social_media_links';
const ENTITY = 'social_link';

/** The whole row, so a deleted link's target is recoverable from the trail. */
const auditSnapshot = (link: SocialLink): Record<string, unknown> => ({
  label: link.label,
  icon: link.icon,
  url: link.url,
  status: link.status,
  displayOrder: link.displayOrder,
});

/**
 * The website-facing shape of one button.
 *
 * Exported because the footer's public read serves both lists in one response,
 * and it must narrow a link exactly the way this module does.
 */
export const toPublicSocialLink = (link: SocialLink): PublicSocialLink => ({
  label: link.label,
  icon: link.icon,
  url: link.url,
});

// ── reads ─────────────────────────────────────────────────────────────────

export const list = async (filters: SocialLinkFilters): Promise<SocialLink[]> =>
  linksRepository.findAll(filters);

export const getById = async (id: string): Promise<SocialLink> => {
  const link = await linksRepository.findById(id);
  if (!link) throw new NotFoundError('Social link');
  return link;
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateSocialLinkInput,
  context: RequestContext,
): Promise<SocialLink> =>
  withTransaction(async (client) => {
    const existing = await linksRepository.count(client);
    if (existing >= LIMITS.MAX_SOCIAL_LINKS) {
      throw new ConflictError(
        `The footer holds at most ${LIMITS.MAX_SOCIAL_LINKS} social links. Delete or unpublish one first.`,
        'SOCIAL_LINK_LIMIT_REACHED',
      );
    }

    // Appended to the end of the row. Position is an editorial decision made
    // with the reorder arrows afterwards, not a number typed on the form.
    const displayOrder = await linksRepository.nextDisplayOrder(client);

    // The button's name is not an input: it is the platform the icon stands for.
    const link = await linksRepository.create(
      { ...input, label: socialLinkLabel(input.icon), displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_LINK_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: link.id,
        newValues: auditSnapshot(link),
      },
      context,
      client,
    );

    return link;
  });

export const update = async (
  id: string,
  patch: UpdateSocialLinkInput,
  context: RequestContext,
): Promise<SocialLink> =>
  withTransaction(async (client) => {
    const existing = await linksRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Social link');

    // A new icon brings its own label; an edit that leaves the icon alone
    // leaves the label alone too.
    const saved = await linksRepository.update(
      id,
      patch.icon !== undefined ? { ...patch, label: socialLinkLabel(patch.icon) } : patch,
      context.adminId,
      client,
    );
    if (!saved) throw new NotFoundError('Social link');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_LINK_UPDATED,
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
 * the reason the contact line's is: different decision, different consequence,
 * and the trail should say which one happened.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<SocialLink> =>
  withTransaction(async (client) => {
    const existing = await linksRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Social link');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) return existing;

    const saved = await linksRepository.updateStatus(id, status, context.adminId, client);
    if (!saved) throw new NotFoundError('Social link');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_LINK_STATUS_CHANGED,
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

/** Takes every link's id in its new order - see the contact lines service. */
export const reorder = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<SocialLink[]> =>
  withTransaction(async (client) => {
    const total = await linksRepository.count(client);
    const existingIds = await linksRepository.findExistingIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more social links do not exist', [
        {
          field: 'ids',
          message: `Unknown social link ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_SOCIAL_LINK',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every social link', [
        {
          field: 'ids',
          message: `Expected all ${total} social link ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await linksRepository.applyOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_LINKS_REORDERED,
        module: MODULE,
        entityType: ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Read on `client` so the list reflects the order just written.
    return linksRepository.findAll({}, client);
  });

/** A hard delete; INACTIVE covers "not in the footer right now". */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await linksRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Social link');

    await linksRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SOCIAL_LINK_DELETED,
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
