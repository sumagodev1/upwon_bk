// src/modules/blog/services/hero-section.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as heroRepository from '../repositories/hero-section.repository';
import {
  BlogHeroSection,
  PublicBlogHeroSection,
  ReplaceBlogHeroSectionInput,
  ResolvedBlogHeroSection,
} from '../types/hero-section.types';

const MODULE = 'blog';
const ENTITY = 'blog_hero_section';

/** Every authored field, so a previous version is recoverable from the trail. */
const auditSnapshot = (section: BlogHeroSection): Record<string, unknown> => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  subtext: section.subtext,
  primaryCtaLabel: section.primaryCtaLabel,
  secondaryCtaLabel: section.secondaryCtaLabel,
});

/** The admin read. Null when the hero has never been saved. */
export const get = async (): Promise<ResolvedBlogHeroSection | null> => heroRepository.find();

/**
 * The website-facing read: the copy and the two button labels. The buttons'
 * targets are not part of it - the site fixes them in code (primary -> /demo,
 * secondary -> /knowledgebase) and takes only their wording from here.
 *
 * 404 while the hero has never been authored, so the site keeps its own
 * built-in slide - exactly what it does when the API is unreachable.
 */
export const getPublished = async (): Promise<PublicBlogHeroSection> => {
  const section = await heroRepository.find();
  if (!section) throw new NotFoundError('Blog hero section');

  return {
    eyebrow: section.eyebrow,
    heading: section.heading,
    subtext: section.subtext,
    primaryCtaLabel: section.primaryCtaLabel,
    secondaryCtaLabel: section.secondaryCtaLabel,
  };
};

export const replace = async (
  input: ReplaceBlogHeroSectionInput,
  context: RequestContext,
): Promise<ResolvedBlogHeroSection> =>
  withTransaction(async (client) => {
    const existing = await heroRepository.findForUpdate(client);
    const saved = await heroRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.BLOG_HERO_UPDATED,
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
