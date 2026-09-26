// src/modules/about-page/services/team-section.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading } from '../../home-page/utils/heading-markup';
import * as membersRepository from '../repositories/team-members.repository';
import * as sectionRepository from '../repositories/team-section.repository';
import {
  AboutTeamSection,
  PublicAboutTeamSection,
  ReplaceAboutTeamSectionInput,
  ResolvedAboutTeamSection,
} from '../types/team.types';
import { toPublicMember } from './team-members.service';

const MODULE = 'about_page';
const ENTITY = 'about_team_section';

const toResolved = (section: AboutTeamSection): ResolvedAboutTeamSection => ({
  ...section,
  headingLines: parseHeading(section.heading),
});

const auditSnapshot = (section: AboutTeamSection): Record<string, unknown> => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  subtext: section.subtext,
});

/** The admin read of the section's copy. Null when it has never been saved. */
export const get = async (): Promise<ResolvedAboutTeamSection | null> => {
  const section = await sectionRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read: the copy and the ACTIVE people under it, in display
 * order, in one response - the page renders them as one band and a second
 * request for the grid would only add a way for the two halves to disagree.
 *
 * 404 while the copy has never been authored, so the site keeps its own built-in
 * section, exactly as when the API is unreachable. An authored section with no
 * ACTIVE people is a different answer: members is [], and the site renders the
 * published headline over an empty grid, because that is what somebody chose
 * when they unpublished the last person.
 *
 * `hasMembers` is what makes that second answer readable on the other side. It
 * counts the rows regardless of status, so the site can tell "every person is
 * INACTIVE" (members: [], hasMembers: true - render the empty grid) from "there is
 * no person row here at all" (members: [], hasMembers: false - nothing is authored,
 * keep the built-in six). Nothing in the panel or the API forbids emptying the list,
 * so the read has to say which of the two it is rather than leave the site guessing:
 * see the note on PublicAboutTeamSection.
 */
export const getPublished = async (): Promise<PublicAboutTeamSection> => {
  const section = await sectionRepository.find();
  if (!section) throw new NotFoundError('About team section');

  const [members, total] = await Promise.all([
    membersRepository.findPublished(),
    membersRepository.count(),
  ]);
  const resolved = toResolved(section);

  return {
    eyebrow: resolved.eyebrow,
    heading: resolved.heading,
    headingLines: resolved.headingLines,
    subtext: resolved.subtext,
    members: await Promise.all(members.map(toPublicMember)),
    hasMembers: total > 0,
  };
};

export const replace = async (
  input: ReplaceAboutTeamSectionInput,
  context: RequestContext,
): Promise<ResolvedAboutTeamSection> => {
  const section = await withTransaction(async (client) => {
    const existing = await sectionRepository.findForUpdate(client);
    const saved = await sectionRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_TEAM_SECTION_UPDATED,
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
