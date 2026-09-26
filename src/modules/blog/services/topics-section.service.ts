// src/modules/blog/services/topics-section.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading } from '../../home-page/utils/heading-markup';
import * as topicsRepository from '../repositories/topics-section.repository';
import {
  BlogTopicsSection,
  PublicBlogTopicsSection,
  ReplaceBlogTopicsSectionInput,
  ResolvedBlogTopicsSection,
} from '../types/topics-section.types';

const MODULE = 'blog';
const ENTITY = 'blog_topics_section';

const toResolved = (section: BlogTopicsSection): ResolvedBlogTopicsSection => ({
  ...section,
  headingLines: parseHeading(section.heading),
});

const auditSnapshot = (section: BlogTopicsSection): Record<string, unknown> => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  subtext: section.subtext,
});

/** The admin read of the intro's copy. Null when it has never been saved. */
export const get = async (): Promise<ResolvedBlogTopicsSection | null> => {
  const section = await topicsRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read: the copy with its heading parsed, so the site maps
 * over headingLines rather than interpreting the ** markers itself.
 *
 * 404 while the intro has never been authored, so the site keeps its built-in
 * "Pick the Lane You Operate In." - exactly as when the API is unreachable.
 * The chips and posts under it are a separate read (/public/blog/posts): the
 * intro and the grid fall back independently.
 */
export const getPublished = async (): Promise<PublicBlogTopicsSection> => {
  const section = await topicsRepository.find();
  if (!section) throw new NotFoundError('Blog topics section');

  const resolved = toResolved(section);
  return {
    eyebrow: resolved.eyebrow,
    heading: resolved.heading,
    headingLines: resolved.headingLines,
    subtext: resolved.subtext,
  };
};

export const replace = async (
  input: ReplaceBlogTopicsSectionInput,
  context: RequestContext,
): Promise<ResolvedBlogTopicsSection> => {
  const section = await withTransaction(async (client) => {
    const existing = await topicsRepository.findForUpdate(client);
    const saved = await topicsRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_TOPICS_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        oldValues: existing ? auditSnapshot(existing) : null,
        newValues: auditSnapshot(saved),
      },
      context,
      client,
    );

    return saved;
  });

  return toResolved(section);
};
