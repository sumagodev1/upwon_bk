// src/modules/insider-page/services/issues.service.ts

import { PoolClient } from 'pg';
import { Executor, withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, ContentStatus } from '../../../config/constants';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as issuesRepository from '../repositories/issues.repository';
import * as storiesRepository from '../repositories/stories.repository';
import {
  CreateInsiderIssueInput,
  InsiderIssue,
  InsiderIssueFilters,
  InsiderIssueSummary,
  InsiderIssueWithStories,
  InsiderStory,
  PublicInsiderIssue,
  PublicInsiderStoryPage,
  UpdateInsiderIssueInput,
} from '../types/issues.types';
import {
  storyAuditSnapshot,
  toPublicStoryCard,
  toResolvedStories,
  toResolvedStory,
} from './stories.service';

const MODULE = 'insider_page';
const ENTITY = 'insider_issue';

/** The patch fields that update() writes as plain columns. */
const PLAIN_FIELDS = ['slug', 'label', 'issueNumber', 'status'] as const;

const auditSnapshot = (issue: InsiderIssue): Record<string, unknown> => ({
  slug: issue.slug,
  label: issue.label,
  issueNumber: issue.issueNumber,
  isCurrent: issue.isCurrent,
  status: issue.status,
});

/**
 * The single-issue response: the issue, its story count, and its stories.
 *
 * Every endpoint that returns one issue returns this, so the admin edit page
 * can take any response as its new state. The rows are read on the caller's
 * executor - inside a write's transaction that means the state just written.
 */
const loadDetail = async (
  id: string,
  executor?: Executor,
): Promise<{ issue: InsiderIssueSummary; stories: InsiderStory[] }> => {
  const issue = await issuesRepository.findById(id, executor);
  if (!issue) throw new NotFoundError('Insider issue');
  const stories = await storiesRepository.findByIssue(id, executor);
  return { issue, stories };
};

const toDetail = async ({
  issue,
  stories,
}: {
  issue: InsiderIssueSummary;
  stories: InsiderStory[];
}): Promise<InsiderIssueWithStories> => ({
  ...issue,
  stories: await toResolvedStories(stories),
});

/**
 * Makes `id` the one current issue and records it.
 *
 * Demote first, then promote: the partial unique index is checked per row, so
 * the reverse order would briefly hold two current issues and fail.
 */
const promoteToCurrent = async (
  id: string,
  context: RequestContext,
  client: PoolClient,
): Promise<void> => {
  const previous = await issuesRepository.findCurrent(client);

  await issuesRepository.clearCurrent(id, context.adminId, client);
  const promoted = await issuesRepository.setCurrentFlag(id, true, context.adminId, client);
  if (!promoted) throw new NotFoundError('Insider issue');

  await auditLogService.record(
    {
      action: AUDIT_ACTIONS.INSIDER_ISSUE_SET_CURRENT,
      module: MODULE,
      entityType: ENTITY,
      entityId: id,
      oldValues: { currentIssueId: previous?.id ?? null, currentIssueSlug: previous?.slug ?? null },
      newValues: { currentIssueId: promoted.id, currentIssueSlug: promoted.slug },
    },
    context,
    client,
  );
};

// ── admin reads ───────────────────────────────────────────────────────────

export const list = (
  filters: InsiderIssueFilters & { search?: string },
): Promise<InsiderIssueSummary[]> => issuesRepository.findAll(filters);

export const getById = async (id: string): Promise<InsiderIssueWithStories> =>
  toDetail(await loadDetail(id));

// ── public reads ──────────────────────────────────────────────────────────

/**
 * The archive the website renders: every ACTIVE issue, newest first, each with
 * its ACTIVE stories in grid order.
 *
 * Exactly one issue comes back with current = true whenever any is published:
 * the flagged issue if it is ACTIVE, otherwise the newest ACTIVE issue. The site
 * therefore never has to reason about "no current issue", and unpublishing the
 * current issue degrades to "show the latest" rather than to an empty page.
 */
export const getPublishedIssues = async (): Promise<PublicInsiderIssue[]> => {
  const issues = await issuesRepository.findPublished();
  if (issues.length === 0) return [];

  const stories = await toResolvedStories(
    await storiesRepository.findPublishedByIssues(issues.map((issue) => issue.id)),
  );

  const currentId = (issues.find((issue) => issue.isCurrent) ?? issues[0]).id;

  return issues.map((issue) => ({
    slug: issue.slug,
    label: issue.label,
    issueNumber: issue.issueNumber,
    current: issue.id === currentId,
    // The query already returns stories in grid order, so filtering keeps it.
    stories: stories.filter((story) => story.issueId === issue.id).map(toPublicStoryCard),
  }));
};

/**
 * One story as an article page. A 404 unless both the issue and the story are
 * ACTIVE - an unpublished issue hides its stories even if they are ACTIVE.
 *
 * The slugs go straight into parameterised queries, so a malformed one simply
 * matches nothing; it is a 404 like any other missing story.
 */
export const getPublishedStory = async (
  issueSlug: string,
  storySlug: string,
): Promise<PublicInsiderStoryPage> => {
  const issue = await issuesRepository.findPublishedBySlug(issueSlug);
  if (!issue) throw new NotFoundError('Story');

  const story = await storiesRepository.findPublishedBySlug(issue.id, storySlug);
  if (!story) throw new NotFoundError('Story');

  const resolved = await toResolvedStory(story);

  return {
    issue: { slug: issue.slug, label: issue.label, issueNumber: issue.issueNumber },
    story: { ...toPublicStoryCard(resolved), body: resolved.body },
  };
};

// ── writes ────────────────────────────────────────────────────────────────

export const create = async (
  input: CreateInsiderIssueInput,
  context: RequestContext,
): Promise<InsiderIssueWithStories> => {
  const detail = await withTransaction(async (client) => {
    // Inserted as not-current and then promoted, so taking the flag from
    // another issue goes through the one path that demotes it and audits it.
    const created = await issuesRepository.create(
      { ...input, isCurrent: false },
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_ISSUE_CREATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: created.id,
        newValues: auditSnapshot(created),
      },
      context,
      client,
    );

    if (input.isCurrent) await promoteToCurrent(created.id, context, client);

    return loadDetail(created.id, client);
  });

  return toDetail(detail);
};

export const update = async (
  id: string,
  patch: UpdateInsiderIssueInput,
  context: RequestContext,
): Promise<InsiderIssueWithStories> => {
  const detail = await withTransaction(async (client) => {
    const existing = await issuesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Insider issue');

    let updated = await issuesRepository.update(id, patch, context.adminId, client);
    if (!updated) throw new NotFoundError('Insider issue');

    // Clearing the flag touches only this row, so it is an ordinary edit.
    // Setting it demotes another issue, so it goes through promoteToCurrent.
    const clearsCurrent = patch.isCurrent === false && existing.isCurrent;
    const setsCurrent = patch.isCurrent === true && !existing.isCurrent;

    if (clearsCurrent) {
      updated = await issuesRepository.setCurrentFlag(id, false, context.adminId, client);
      if (!updated) throw new NotFoundError('Insider issue');
    }

    const editsColumns = PLAIN_FIELDS.some((field) => patch[field] !== undefined);
    if (editsColumns || clearsCurrent) {
      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.INSIDER_ISSUE_UPDATED,
          module: MODULE,
          entityType: ENTITY,
          entityId: id,
          oldValues: auditSnapshot(existing),
          newValues: auditSnapshot(updated),
        },
        context,
        client,
      );
    }

    if (setsCurrent) await promoteToCurrent(id, context, client);

    return loadDetail(id, client);
  });

  return toDetail(detail);
};

/**
 * Makes this the issue /newsletter opens on. Idempotent: an issue that is
 * already current is returned as-is, with no write and no audit row.
 */
export const setCurrent = async (
  id: string,
  context: RequestContext,
): Promise<InsiderIssueWithStories> => {
  const detail = await withTransaction(async (client) => {
    const existing = await issuesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Insider issue');

    if (!existing.isCurrent) await promoteToCurrent(id, context, client);

    return loadDetail(id, client);
  });

  return toDetail(detail);
};

/**
 * Publish / unpublish. Unpublishing the current issue is allowed: the public
 * read falls back to the newest published issue until another is made current.
 */
export const setStatus = async (
  id: string,
  status: ContentStatus,
  context: RequestContext,
): Promise<InsiderIssueWithStories> => {
  const detail = await withTransaction(async (client) => {
    const existing = await issuesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Insider issue');

    if (existing.status !== status) {
      const updated = await issuesRepository.updateStatus(id, status, context.adminId, client);
      if (!updated) throw new NotFoundError('Insider issue');

      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.INSIDER_ISSUE_STATUS_CHANGED,
          module: MODULE,
          entityType: ENTITY,
          entityId: id,
          oldValues: { status: existing.status },
          newValues: { status: updated.status },
        },
        context,
        client,
      );
    }

    return loadDetail(id, client);
  });

  return toDetail(detail);
};

/** Deletes the issue and, by cascade, every story in it. */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await issuesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Insider issue');

    // Read before the delete: the cascade takes the stories with it, and the
    // audit row is the only place their copy survives.
    const stories = await storiesRepository.findByIssue(id, client);

    await issuesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.INSIDER_ISSUE_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: {
          ...auditSnapshot(existing),
          stories: stories.map(storyAuditSnapshot),
        },
      },
      context,
      client,
    );
  });
};
