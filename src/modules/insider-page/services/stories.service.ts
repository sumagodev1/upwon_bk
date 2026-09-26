// src/modules/insider-page/services/stories.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus, LIMITS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as issuesRepository from '../repositories/issues.repository';
import * as storiesRepository from '../repositories/stories.repository';
import {
  CreateInsiderStoryInput,
  InsiderStory,
  PublicInsiderStoryCard,
  ResolvedInsiderStory,
  UpdateInsiderStoryInput,
} from '../types/issues.types';
import { INSIDER_IMAGE_SPECS } from '../utils/insider-image-spec';

const MODULE = 'insider_page';
const ENTITY = 'insider_story';

// ── mapping, shared with issues.service ───────────────────────────────────

export const toResolvedStory = async (story: InsiderStory): Promise<ResolvedInsiderStory> => ({
  ...story,
  image: await resolveImageSource(story.imageUrl, story.imageFileId),
});

export const toResolvedStories = (stories: InsiderStory[]): Promise<ResolvedInsiderStory[]> =>
  Promise.all(stories.map(toResolvedStory));

/** A common adult reading speed, for the "N min read" label. */
const WORDS_PER_MINUTE = 200;

/**
 * Worked out from the body rather than authored, so it can never drift from
 * the text it describes. Null for a story with no body yet.
 */
const readTimeOf = (body: string[]): string | null => {
  const words = body.join(' ').split(/\s+/).filter(Boolean).length;
  // Rounded up: a 250-word story is a 2-minute read, not a 1-minute one.
  return words === 0 ? null : `${Math.ceil(words / WORDS_PER_MINUTE)} min read`;
};

/** A story as a grid card, renamed to the site's own keys (`cta`). */
export const toPublicStoryCard = (story: ResolvedInsiderStory): PublicInsiderStoryCard => ({
  slug: story.slug,
  eyebrow: story.eyebrow,
  cta: story.ctaLabel,
  title: story.title,
  blurb: story.blurb,
  image: story.image,
  // Alt text is not authored for stories: the site has always used the title,
  // so an image is never announced unlabelled.
  imageAlt: story.image ? story.title : null,
  readTime: readTimeOf(story.body),
});

/** The fields an audit entry records - the full row, so copy is recoverable. */
export const storyAuditSnapshot = (story: InsiderStory): Record<string, unknown> => ({
  issueId: story.issueId,
  slug: story.slug,
  eyebrow: story.eyebrow,
  ctaLabel: story.ctaLabel,
  title: story.title,
  blurb: story.blurb,
  imageUrl: story.imageUrl,
  imageFileId: story.imageFileId,
  imageAlt: story.imageAlt,
  readTime: story.readTime,
  body: story.body,
  displayOrder: story.displayOrder,
  status: story.status,
});

const assertUsableStoryImage = (fileId: string): Promise<void> =>
  assertUsableImageFile(fileId, INSIDER_IMAGE_SPECS.story, 'imageFileId');

// ── reads ─────────────────────────────────────────────────────────────────

export const getById = async (issueId: string, storyId: string): Promise<ResolvedInsiderStory> => {
  const story = await storiesRepository.findById(issueId, storyId);
  if (!story) throw new NotFoundError('Insider story');
  return toResolvedStory(story);
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  issueId: string,
  input: CreateInsiderStoryInput,
  context: RequestContext,
): Promise<ResolvedInsiderStory> => {
  if (input.imageFileId) await assertUsableStoryImage(input.imageFileId);

  const story = await withTransaction(async (client) => {
    // Locking the parent issue serialises concurrent creates into the same
    // issue, so two of them cannot both pass the limit check below. It also
    // turns an unknown issue into a clean 404 rather than an FK violation.
    const issue = await issuesRepository.findByIdForUpdate(issueId, client);
    if (!issue) throw new NotFoundError('Insider issue');

    const existing = await storiesRepository.countByIssue(issueId, client);
    if (existing >= LIMITS.MAX_INSIDER_STORIES_PER_ISSUE) {
      throw new ConflictError(
        `An issue holds at most ${LIMITS.MAX_INSIDER_STORIES_PER_ISSUE} stories. Delete or move one first.`,
        'INSIDER_STORY_LIMIT_REACHED',
      );
    }

    const displayOrder =
      input.displayOrder ?? (await storiesRepository.nextDisplayOrder(issueId, client));

    const created = await storiesRepository.create(
      issueId,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_STORY_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: storyAuditSnapshot(created),
      },
      context,
      client,
    );

    return created;
  });

  return toResolvedStory(story);
};

export const update = async (
  issueId: string,
  storyId: string,
  patch: UpdateInsiderStoryInput,
  context: RequestContext,
): Promise<ResolvedInsiderStory> => {
  if (patch.imageFileId) await assertUsableStoryImage(patch.imageFileId);

  const story = await withTransaction(async (client) => {
    const existing = await storiesRepository.findByIdForUpdate(issueId, storyId, client);
    if (!existing) throw new NotFoundError('Insider story');

    const updated = await storiesRepository.update(
      issueId,
      storyId,
      patch,
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('Insider story');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_STORY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: storyId,
        oldValues: storyAuditSnapshot(existing),
        newValues: storyAuditSnapshot(updated),
      },
      context,
      client,
    );

    return updated;
  });

  return toResolvedStory(story);
};

/** Publish / unpublish, separate from update() for the same reasons as the hero. */
export const setStatus = async (
  issueId: string,
  storyId: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedInsiderStory> => {
  const story = await withTransaction(async (client) => {
    const existing = await storiesRepository.findByIdForUpdate(issueId, storyId, client);
    if (!existing) throw new NotFoundError('Insider story');

    if (existing.status === status) return existing;

    const updated = await storiesRepository.updateStatus(
      issueId,
      storyId,
      status,
      context.adminId,
      client,
    );
    if (!updated) throw new NotFoundError('Insider story');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_STORY_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: storyId,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

  return toResolvedStory(story);
};

/**
 * Takes every story id of the issue in its new order. Requiring the whole set
 * is what makes the result a total order - see the hero reorder.
 */
export const reorder = async (
  issueId: string,
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedInsiderStory[]> => {
  const stories = await withTransaction(async (client) => {
    const issue = await issuesRepository.findByIdForUpdate(issueId, client);
    if (!issue) throw new NotFoundError('Insider issue');

    const total = await storiesRepository.countByIssue(issueId, client);
    const existingIds = await storiesRepository.findExistingIds(issueId, orderedIds, client);

    // "Unknown" includes a real story id that belongs to a different issue.
    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more stories are not in this issue', [
        {
          field: 'ids',
          message: `Unknown story ids for this issue: ${unknown.join(', ')}`,
          code: 'UNKNOWN_STORY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every story in the issue', [
        {
          field: 'ids',
          message: `Expected all ${total} story ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await storiesRepository.applyOrder(issueId, orderedIds, context.adminId, client);

    // Recorded against the issue: the order is a property of the issue's
    // story set, not of any one story.
    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_STORIES_REORDERED,
        module: MODULE,
        entityType: 'insider_issue',
        entityId: issueId,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Read on `client` so the list reflects the order just written.
    return storiesRepository.findByIssue(issueId, client);
  });

  return toResolvedStories(stories);
};

export const remove = async (
  issueId: string,
  storyId: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await storiesRepository.findByIdForUpdate(issueId, storyId, client);
    if (!existing) throw new NotFoundError('Insider story');

    await storiesRepository.remove(issueId, storyId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_STORY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: storyId,
        oldValues: storyAuditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
