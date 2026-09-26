// src/modules/product-pages/hreasy-page/services/outcomes-section.service.ts

import { Executor, withTransaction } from '../../../../config/database';
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
import { checkImageDimensions } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/outcomes-section.repository';
import {
  CreateHreasyOutcomeStatInput,
  CreateHreasyOutcomeStoryInput,
  HreasyOutcomeStat,
  HreasyOutcomeStory,
  HreasyOutcomeStoryFilters,
  PublicHreasyOutcomesSection,
  ResolvedHreasyOutcomeStory,
  UpdateHreasyOutcomeStatInput,
  UpdateHreasyOutcomeStoryInput,
} from '../types/outcomes-section.types';

const MODULE = 'hreasy_page';
const STORY_ENTITY = 'hreasy_outcome_story';
const STAT_ENTITY = 'hreasy_outcome_stat';

/** Only images belong in a brand mark; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the card falls back to drawing its name,
  // which is a working state rather than a hole.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

/**
 * Rejects a file id that is not a live image of a usable size.
 *
 * No ratio rule: the mark is drawn object-contain at a fixed height, so a
 * wordmark and a roundel both render correctly.
 */
const assertUsableLogoFile = async (fileId: string): Promise<void> => {
  const field = 'logoFileId';
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Brand mark must be an image', [
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

  const problem = checkImageDimensions('hreasyOutcomeLogo', dimensions);
  if (problem) {
    throw new ValidationError('Brand mark is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};

/**
 * Refuses a slug already in use.
 *
 * A field error rather than the raw unique-violation a 409 would carry: the
 * slug is authored, so the message belongs on the input that produced it.
 *
 * @param excludeId the story being changed, so re-saving its own slug is fine
 */
const assertSlugFree = async (
  slug: string,
  excludeId: string | null,
  client?: Executor,
): Promise<void> => {
  const existing = await repo.findStoryBySlug(slug, client);
  if (!existing || existing.id === excludeId) return;

  throw new ValidationError('That slug is already in use', [
    {
      field: 'slug',
      message: `"${slug}" already belongs to ${existing.name}. Slugs identify a story in links, so they have to be unique.`,
      code: 'DUPLICATE_SLUG',
    },
  ]);
};

const toResolved = async (
  story: HreasyOutcomeStory,
  stats: HreasyOutcomeStat[],
): Promise<ResolvedHreasyOutcomeStory> => ({
  ...story,
  logo: await resolveSource(story.logoUrl, story.logoFileId),
  stats,
});

/** Groups a flat bulk read back under the story each figure belongs to. */
const groupByStory = (rows: HreasyOutcomeStat[]): Map<string, HreasyOutcomeStat[]> => {
  const byStory = new Map<string, HreasyOutcomeStat[]>();
  for (const row of rows) {
    const list = byStory.get(row.storyId);
    if (list) list.push(row);
    else byStory.set(row.storyId, [row]);
  }
  return byStory;
};

// ── reads ─────────────────────────────────────────────────────────────────

export const listStories = async (
  filters: HreasyOutcomeStoryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedHreasyOutcomeStory[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllStories(filters, pagination);

  // One bulk read for every figure on the page rather than a query per card.
  const stats = await repo.findActiveStatsForStories(rows.map((story) => story.id));
  const byStory = groupByStory(stats);

  return {
    rows: await Promise.all(
      rows.map((story) => toResolved(story, byStory.get(story.id) ?? [])),
    ),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getStoryById = async (id: string): Promise<ResolvedHreasyOutcomeStory> => {
  const story = await repo.findStoryById(id);
  if (!story) throw new NotFoundError('Outcome story');
  // Every status here, not just active: this is the editing view of the card.
  return toResolved(story, await repo.findStatsByStory(id));
};

export const listStats = async (storyId: string): Promise<HreasyOutcomeStat[]> => {
  const story = await repo.findStoryById(storyId);
  if (!story) throw new NotFoundError('Outcome story');
  return repo.findStatsByStory(storyId);
};

export const getStatById = async (
  storyId: string,
  statId: string,
): Promise<HreasyOutcomeStat> => {
  const stat = await repo.findStatById(statId);
  // The story is checked too, so a figure cannot be read through another card.
  if (!stat || stat.storyId !== storyId) throw new NotFoundError('Figure');
  return stat;
};

/**
 * The website-facing read, or null when nothing is published.
 *
 * Needs both halves: the copy that heads the row and at least one card. With
 * either missing the site keeps the row it ships, which is a complete working
 * section - better than a heading over nothing.
 */
export const getPublished = async (): Promise<PublicHreasyOutcomesSection | null> => {
  const stories = await repo.findPublishedStories();
  if (stories.length === 0) return null;

  const copy = await sectionCopyService.get('hreasy', 'outcomes');
  if (!copy) return null;

  const stats = await repo.findActiveStatsForStories(stories.map((story) => story.id));
  const byStory = groupByStory(stats);

  const resolved = await Promise.all(
    stories.map((story) => toResolved(story, byStory.get(story.id) ?? [])),
  );

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    stories: resolved.map((story) => ({
      slug: story.slug,
      name: story.name,
      // Null means the card draws the name as words instead.
      logo: story.logo,
      tag: story.tag,
      heroValue: story.heroValue,
      heroLabel: story.heroLabel,
      body: story.body,
      linkLabel: story.linkLabel,
      linkHref: story.linkHref,
      stats: story.stats.map((stat) => ({ value: stat.value, label: stat.label })),
    })),
  };
};

// ── the story cards ───────────────────────────────────────────────────────

export const createStory = async (
  input: CreateHreasyOutcomeStoryInput,
  context: RequestContext,
): Promise<ResolvedHreasyOutcomeStory> => {
  if (input.logoFileId) await assertUsableLogoFile(input.logoFileId);

  const story = await withTransaction(async (client) => {
    const existing = await repo.countStories(client);
    if (existing >= LIMITS.MAX_HREASY_OUTCOME_STORIES) {
      throw new ConflictError(
        `The row holds at most ${LIMITS.MAX_HREASY_OUTCOME_STORIES} stories. Delete or deactivate one first.`,
      );
    }

    await assertSlugFree(input.slug, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextStoryOrder(client));
    const created = await repo.createStory({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STORY_CREATED,
        module: MODULE,
        entityType: STORY_ENTITY,
        entityId: created.id,
        newValues: { name: created.name, slug: created.slug, status: created.status },
      },
      context,
      client,
    );

    return created;
  });

  // A new card has no figures yet, so there is nothing to read back for it.
  return toResolved(story, []);
};

export const updateStory = async (
  id: string,
  patch: UpdateHreasyOutcomeStoryInput,
  context: RequestContext,
): Promise<ResolvedHreasyOutcomeStory> => {
  if (patch.logoFileId) await assertUsableLogoFile(patch.logoFileId);

  await withTransaction(async (client) => {
    const existing = await repo.findStoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome story');

    if (patch.slug && patch.slug !== existing.slug) {
      await assertSlugFree(patch.slug, id, client);
    }

    const updated = await repo.updateStory(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Outcome story');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STORY_UPDATED,
        module: MODULE,
        entityType: STORY_ENTITY,
        entityId: id,
        oldValues: { name: existing.name, slug: existing.slug, status: existing.status },
        newValues: { name: updated.name, slug: updated.slug, status: updated.status },
      },
      context,
      client,
    );
  });

  return getStoryById(id);
};

export const setStoryStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<ResolvedHreasyOutcomeStory> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome story');

    const updated = await repo.updateStoryStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Outcome story');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STORY_UPDATED,
        module: MODULE,
        entityType: STORY_ENTITY,
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );
  });

  return getStoryById(id);
};

export const reorderStories = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedHreasyOutcomeStory[]> => {
  await withTransaction(async (client) => {
    const total = await repo.countStories(client);
    const existingIds = await repo.findExistingStoryIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more stories do not exist', [
        {
          field: 'ids',
          message: `Unknown story ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_HREASY_OUTCOME_STORY',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every story', [
        {
          field: 'ids',
          message: `Expected all ${total} story ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyStoryOrder(orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STORIES_REORDERED,
        module: MODULE,
        entityType: STORY_ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );
  });

  const { rows } = await listStories(
    {},
    { page: 1, limit: LIMITS.MAX_HREASY_OUTCOME_STORIES, offset: 0 },
  );
  return rows;
};

export const removeStory = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Outcome story');

    // The figures go with it - the foreign key cascades.
    await repo.removeStory(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STORY_DELETED,
        module: MODULE,
        entityType: STORY_ENTITY,
        entityId: id,
        oldValues: { name: existing.name, slug: existing.slug },
      },
      context,
      client,
    );
  });
};

// ── the figures ───────────────────────────────────────────────────────────

export const createStat = async (
  storyId: string,
  input: CreateHreasyOutcomeStatInput,
  context: RequestContext,
): Promise<HreasyOutcomeStat> =>
  withTransaction(async (client) => {
    const story = await repo.findStoryByIdForUpdate(storyId, client);
    if (!story) throw new NotFoundError('Outcome story');

    const existing = await repo.countStats(storyId, client);
    if (existing >= LIMITS.MAX_HREASY_OUTCOME_STATS) {
      throw new ConflictError(
        `A card holds at most ${LIMITS.MAX_HREASY_OUTCOME_STATS} figures - they are drawn in a row of three. Delete or deactivate one first.`,
      );
    }

    const displayOrder = input.displayOrder ?? (await repo.nextStatOrder(storyId, client));
    const created = await repo.createStat(
      storyId,
      { ...input, displayOrder },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STAT_CREATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: created.id,
        newValues: { storyId, value: created.value, label: created.label },
      },
      context,
      client,
    );

    return created;
  });

export const updateStat = async (
  storyId: string,
  statId: string,
  patch: UpdateHreasyOutcomeStatInput,
  context: RequestContext,
): Promise<HreasyOutcomeStat> =>
  withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(statId, client);
    // The story is checked too, so a figure cannot be edited through another card.
    if (!existing || existing.storyId !== storyId) throw new NotFoundError('Figure');

    const updated = await repo.updateStat(statId, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Figure');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STAT_UPDATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: statId,
        oldValues: { value: existing.value, label: existing.label, status: existing.status },
        newValues: { value: updated.value, label: updated.label, status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const setStatStatus = async (
  storyId: string,
  statId: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<HreasyOutcomeStat> =>
  withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(statId, client);
    if (!existing || existing.storyId !== storyId) throw new NotFoundError('Figure');

    const updated = await repo.updateStatStatus(statId, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Figure');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STAT_UPDATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: statId,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
      },
      context,
      client,
    );

    return updated;
  });

export const reorderStats = async (
  storyId: string,
  orderedIds: string[],
  context: RequestContext,
): Promise<HreasyOutcomeStat[]> =>
  withTransaction(async (client) => {
    const story = await repo.findStoryByIdForUpdate(storyId, client);
    if (!story) throw new NotFoundError('Outcome story');

    const total = await repo.countStats(storyId, client);
    const existingIds = await repo.findExistingStatIds(storyId, orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more figures do not belong to this story', [
        {
          field: 'ids',
          message: `Unknown figure ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_HREASY_OUTCOME_STAT',
        },
      ]);
    }

    if (orderedIds.length !== total) {
      throw new ValidationError('Reorder must list every figure on this story', [
        {
          field: 'ids',
          message: `Expected all ${total} figure ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyStatOrder(storyId, orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STATS_REORDERED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: storyId,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findStatsByStory(storyId, client);
  });

export const removeStat = async (
  storyId: string,
  statId: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStatByIdForUpdate(statId, client);
    if (!existing || existing.storyId !== storyId) throw new NotFoundError('Figure');

    await repo.removeStat(statId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HREASY_OUTCOME_STAT_DELETED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: statId,
        oldValues: { storyId, value: existing.value, label: existing.label },
      },
      context,
      client,
    );
  });
};
