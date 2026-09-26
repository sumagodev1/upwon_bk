// src/modules/about-page/services/numbers-section.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading } from '../../home-page/utils/heading-markup';
import * as statsRepository from '../repositories/number-stats.repository';
import * as sectionRepository from '../repositories/numbers-section.repository';
import {
  AboutNumbersSection,
  PublicAboutNumbersSection,
  ReplaceAboutNumbersSectionInput,
  ResolvedAboutNumbersSection,
} from '../types/numbers.types';
import { toPublicStat } from './number-stats.service';

const MODULE = 'about_page';
const ENTITY = 'about_numbers_section';

const toResolved = (section: AboutNumbersSection): ResolvedAboutNumbersSection => ({
  ...section,
  headingLines: parseHeading(section.heading),
});

const auditSnapshot = (section: AboutNumbersSection): Record<string, unknown> => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  subtext: section.subtext,
});

/** The admin read of the section's copy. Null when it has never been saved. */
export const get = async (): Promise<ResolvedAboutNumbersSection | null> => {
  const section = await sectionRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read: the copy and the ACTIVE cards under it, in display
 * order, in one response - see the team section service for why they travel
 * together.
 *
 * 404 while the copy has never been authored. An authored section with no ACTIVE
 * cards returns stats: [], which is what somebody chose when they unpublished
 * the last one.
 *
 * `hasStats` counts the rows regardless of status, so the site can tell that
 * second answer from "there is no card row at all" - see the team section service
 * for the full argument. The stakes are highest on this band: the built-in four
 * are claims about the business ('150+ Businesses Deployed', '98% Customer
 * Retention'), and a card taken down because it is no longer defensible must not
 * reappear because the list it was in became empty.
 */
export const getPublished = async (): Promise<PublicAboutNumbersSection> => {
  const section = await sectionRepository.find();
  if (!section) throw new NotFoundError('About numbers section');

  const [stats, total] = await Promise.all([
    statsRepository.findPublished(),
    statsRepository.count(),
  ]);
  const resolved = toResolved(section);

  return {
    eyebrow: resolved.eyebrow,
    heading: resolved.heading,
    headingLines: resolved.headingLines,
    subtext: resolved.subtext,
    stats: stats.map(toPublicStat),
    hasStats: total > 0,
  };
};

export const replace = async (
  input: ReplaceAboutNumbersSectionInput,
  context: RequestContext,
): Promise<ResolvedAboutNumbersSection> => {
  const section = await withTransaction(async (client) => {
    const existing = await sectionRepository.findForUpdate(client);
    const saved = await sectionRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_NUMBERS_SECTION_UPDATED,
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
