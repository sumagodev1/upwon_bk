// src/modules/product-pages/fms-page/services/outcomes-section.service.ts

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
import { checkImageDimensions, ImageSlot } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';
import * as repo from '../repositories/outcomes-section.repository';
import {
  CreateFmsOutcomeStatInput,
  CreateFmsOutcomeStoryInput,
  FmsOutcomeStat,
  FmsOutcomeStory,
  FmsOutcomeStoryFilters,
  PublicFmsOutcomesSection,
  ResolvedFmsOutcomeStory,
  UpdateFmsOutcomeStatInput,
  UpdateFmsOutcomeStoryInput,
} from '../types/outcomes-section.types';

const MODULE = 'fms_page';
const STORY_ENTITY = 'fms_outcome_story';
const STAT_ENTITY = 'fms_outcome_stat';

/** Only images belong in the card or behind it; a PDF there is a broken frame. */
const IMAGE_MIME_PREFIX = 'image/';

const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: the story resolves without that image and
  // the public read skips it, rather than failing the whole request.
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
  story: FmsOutcomeStory,
  stats: FmsOutcomeStat[],
): Promise<ResolvedFmsOutcomeStory> => ({
  ...story,
  logo: await resolveSource(story.logoUrl, story.logoFileId),
  photo: await resolveSource(story.photoUrl, story.photoFileId),
  stats,
});

/** Groups a flat bulk read back under the story each figure belongs to. */
const groupByStory = (stats: FmsOutcomeStat[]): Map<string, FmsOutcomeStat[]> => {
  const byStory = new Map<string, FmsOutcomeStat[]>();
  for (const stat of stats) {
    const list = byStory.get(stat.storyId) ?? [];
    list.push(stat);
    byStory.set(stat.storyId, list);
  }
  return byStory;
};

// -- reads ------------------------------------------------------------------

/**
 * The admin list.
 *
 * Figures come along, in one bulk query rather than one per row, so the list
 * can show how many each story has without N round trips.
 */
export const listStories = async (
  filters: FmsOutcomeStoryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ResolvedFmsOutcomeStory[]; meta: PaginationMeta }> => {
  const { rows, total } = await repo.findAllStories(filters, pagination);
  const stats = await repo.findActiveStatsForStories(rows.map((r) => r.id));
  const byStory = groupByStory(stats);

  const resolved = await Promise.all(
    rows.map((row) => toResolved(row, byStory.get(row.id) ?? [])),
  );
  return { rows: resolved, meta: buildPaginationMeta(total, pagination) };
};

/** One story with every figure it owns, whatever their status. */
export const getStoryById = async (id: string): Promise<ResolvedFmsOutcomeStory> => {
  const story = await repo.findStoryById(id);
  if (!story) throw new NotFoundError('Story');
  return toResolved(story, await repo.findStatsByStory(id));
};

// -- stories: writes --------------------------------------------------------

export const createStory = async (
  input: CreateFmsOutcomeStoryInput,
  context: RequestContext,
): Promise<ResolvedFmsOutcomeStory> => {
  if (input.logoFileId) {
    await assertUsableImageFile(input.logoFileId, 'fmsOutcomeLogo', 'logoFileId');
  }
  if (input.photoFileId) {
    await assertUsableImageFile(input.photoFileId, 'fmsOutcomePhoto', 'photoFileId');
  }

  const story = await withTransaction(async (client) => {
    const existing = await repo.countStories(client);
    if (existing >= LIMITS.MAX_FMS_OUTCOME_STORIES) {
      throw new ConflictError(
        `The carousel holds at most ${LIMITS.MAX_FMS_OUTCOME_STORIES} stories. Delete or deactivate one first.`,
      );
    }

    await assertSlugFree(input.slug, null, client);

    const displayOrder = input.displayOrder ?? (await repo.nextStoryOrder(client));
    const created = await repo.createStory({ ...input, displayOrder }, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_OUTCOME_STORY_CREATED,
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

  return toResolved(story, []);
};

export const updateStory = async (
  id: string,
  patch: UpdateFmsOutcomeStoryInput,
  context: RequestContext,
): Promise<ResolvedFmsOutcomeStory> => {
  if (patch.logoFileId) {
    await assertUsableImageFile(patch.logoFileId, 'fmsOutcomeLogo', 'logoFileId');
  }
  if (patch.photoFileId) {
    await assertUsableImageFile(patch.photoFileId, 'fmsOutcomePhoto', 'photoFileId');
  }

  await withTransaction(async (client) => {
    const existing = await repo.findStoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Story');

    if (patch.slug && patch.slug !== existing.slug) {
      await assertSlugFree(patch.slug, id, client);
    }

    const updated = await repo.updateStory(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Story');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_OUTCOME_STORY_UPDATED,
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
): Promise<ResolvedFmsOutcomeStory> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Story');

    const updated = await repo.updateStoryStatus(id, status, context.adminId, client);
    if (!updated) throw new NotFoundError('Story');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_OUTCOME_STORY_UPDATED,
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

/**
 * Reorder takes the complete id list in its new order, not a single moved id.
 * A whole-set rewrite is idempotent and cannot leave gaps or duplicates.
 */
export const reorderStories = async (
  orderedIds: string[],
  context: RequestContext,
): Promise<ResolvedFmsOutcomeStory[]> => {
  const rows = await withTransaction(async (client) => {
    const total = await repo.countStories(client);
    const existingIds = await repo.findExistingStoryIds(orderedIds, client);

    const unknown = orderedIds.filter((id) => !existingIds.includes(id));
    if (unknown.length > 0) {
      throw new ValidationError('One or more stories do not exist', [
        {
          field: 'ids',
          message: `Unknown story ids: ${unknown.join(', ')}`,
          code: 'UNKNOWN_FMS_OUTCOME_STORY',
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
        action: AUDIT_ACTIONS.FMS_OUTCOME_STORIES_REORDERED,
        module: MODULE,
        entityType: STORY_ENTITY,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    // Reads on `client`, inside the transaction, so the returned list reflects
    // the order just written rather than the committed state it replaced.
    return repo.findAllStories(
      {},
      { page: 1, limit: LIMITS.MAX_FMS_OUTCOME_STORIES, offset: 0 },
      client,
    );
  });

  return Promise.all(rows.rows.map((row) => toResolved(row, [])));
};

/** Deleting a story takes its figures with it - the FK cascades. */
export const removeStory = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await repo.findStoryByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Story');

    const statCount = await repo.countStats(id, client);
    await repo.removeStory(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_OUTCOME_STORY_DELETED,
        module: MODULE,
        entityType: STORY_ENTITY,
        entityId: id,
        // Recorded because the cascade is otherwise invisible in the trail.
        oldValues: { name: existing.name, slug: existing.slug, statsRemoved: statCount },
      },
      context,
      client,
    );
  });
};

// -- figures: writes --------------------------------------------------------

/**
 * Figures are addressed through their story, so the story in the path is
 * checked rather than trusted. Without it the nesting would be decoration: any
 * id would resolve under any parent, and a panel could delete a figure
 * belonging to a story the editor is not even looking at.
 *
 * A mismatch reads as "no such figure here", not as a permission error - the
 * figure genuinely is not at that address.
 */
const assertOwned = (stat: FmsOutcomeStat | null, storyId: string): FmsOutcomeStat => {
  if (!stat || stat.storyId !== storyId) throw new NotFoundError('Figure');
  return stat;
};

export const listStats = async (storyId: string): Promise<FmsOutcomeStat[]> => {
  const story = await repo.findStoryById(storyId);
  if (!story) throw new NotFoundError('Story');
  return repo.findStatsByStory(storyId);
};

export const getStatById = async (
  storyId: string,
  id: string,
): Promise<FmsOutcomeStat> => assertOwned(await repo.findStatById(id), storyId);

export const createStat = async (
  storyId: string,
  input: CreateFmsOutcomeStatInput,
  context: RequestContext,
): Promise<FmsOutcomeStat> =>
  withTransaction(async (client) => {
    const story = await repo.findStoryById(storyId, client);
    if (!story) throw new NotFoundError('Story');

    const existing = await repo.countStats(storyId, client);
    if (existing >= LIMITS.MAX_FMS_OUTCOME_STATS) {
      throw new ConflictError(
        `A story shows at most ${LIMITS.MAX_FMS_OUTCOME_STATS} figures - the card draws them in a three-column row. Delete or deactivate one first.`,
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
        action: AUDIT_ACTIONS.FMS_OUTCOME_STAT_CREATED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: created.id,
        newValues: { story: story.slug, value: created.value, label: created.label },
      },
      context,
      client,
    );

    return created;
  });

export const updateStat = async (
  storyId: string,
  id: string,
  patch: UpdateFmsOutcomeStatInput,
  context: RequestContext,
): Promise<FmsOutcomeStat> =>
  withTransaction(async (client) => {
    const existing = assertOwned(await repo.findStatByIdForUpdate(id, client), storyId);

    const updated = await repo.updateStat(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Figure');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_OUTCOME_STAT_UPDATED,
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
  storyId: string,
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<FmsOutcomeStat> => updateStat(storyId, id, { status }, context);

export const reorderStats = async (
  storyId: string,
  orderedIds: string[],
  context: RequestContext,
): Promise<FmsOutcomeStat[]> =>
  withTransaction(async (client) => {
    const story = await repo.findStoryById(storyId, client);
    if (!story) throw new NotFoundError('Story');

    const current = await repo.findStatsByStory(storyId, client);
    const currentIds = current.map((s) => s.id);

    const foreign = orderedIds.filter((id) => !currentIds.includes(id));
    if (foreign.length > 0) {
      throw new ValidationError('One or more figures do not belong to this story', [
        {
          field: 'ids',
          message: `Not figures of ${story.name}: ${foreign.join(', ')}`,
          code: 'UNKNOWN_FMS_OUTCOME_STAT',
        },
      ]);
    }

    if (orderedIds.length !== currentIds.length) {
      throw new ValidationError('Reorder must list every figure', [
        {
          field: 'ids',
          message: `Expected all ${currentIds.length} figure ids, received ${orderedIds.length}`,
          code: 'INCOMPLETE_ORDER',
        },
      ]);
    }

    await repo.applyStatOrder(storyId, orderedIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_OUTCOME_STATS_REORDERED,
        module: MODULE,
        entityType: STAT_ENTITY,
        entityId: storyId,
        newValues: { order: orderedIds },
      },
      context,
      client,
    );

    return repo.findStatsByStory(storyId, client);
  });

export const removeStat = async (
  storyId: string,
  id: string,
  context: RequestContext,
): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = assertOwned(await repo.findStatByIdForUpdate(id, client), storyId);

    await repo.removeStat(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FMS_OUTCOME_STAT_DELETED,
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

// -- the website-facing read ------------------------------------------------

/**
 * The whole carousel in one call.
 *
 * It rotates on a timer in the browser, so sending stories one at a time would
 * mean a request every few seconds for content already known. Null when the
 * copy or the stories are missing - the page then keeps the carousel it ships,
 * which is a complete working one.
 */
export const getPublished = async (): Promise<PublicFmsOutcomesSection | null> => {
  const [copy, stories] = await Promise.all([
    sectionCopyService.get('fms', 'outcomes'),
    repo.findPublishedStories(),
  ]);
  if (!copy || stories.length === 0) return null;

  const stats = await repo.findActiveStatsForStories(stories.map((s) => s.id));
  const byStory = groupByStory(stats);

  const cards = await Promise.all(
    stories.map(async (story) => ({
      slug: story.slug,
      name: story.name,
      logo: await resolveSource(story.logoUrl, story.logoFileId),
      photo: await resolveSource(story.photoUrl, story.photoFileId),
      quote: story.quote,
      personName: story.personName,
      personCompany: story.personCompany,
      linkLabel: story.linkLabel,
      linkHref: story.linkHref,
      stats: (byStory.get(story.id) ?? []).map((stat) => ({
        value: stat.value,
        label: stat.label,
      })),
    })),
  );

  /*
   * A story whose mark or photograph went missing would draw a card with a
   * hole in it, so it is dropped rather than shown half-built. The narrowing is
   * what lets the published shape promise both as strings.
   */
  const usable = cards.filter(
    (card): card is typeof card & { logo: string; photo: string } =>
      card.logo !== null && card.photo !== null,
  );
  if (usable.length === 0) return null;

  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingLines: copy.headingLines,
    subtext: copy.subtext ?? '',
    stories: usable,
  };
};
