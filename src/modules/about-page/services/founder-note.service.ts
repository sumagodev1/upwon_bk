// src/modules/about-page/services/founder-note.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { assertUsableImageFile, resolveImageSource } from '../../home-page/utils/image-asset';
import * as founderNoteRepository from '../repositories/founder-note.repository';
import {
  AboutFounderNote,
  PublicAboutFounderNote,
  ReplaceAboutFounderNoteInput,
  ResolvedAboutFounderNote,
} from '../types/founder-note.types';
import { ABOUT_IMAGE_SPECS } from '../utils/about-image-spec';

const MODULE = 'about_page';
const ENTITY = 'about_founder_note';

const toResolved = async (
  section: AboutFounderNote,
): Promise<ResolvedAboutFounderNote> => ({
  ...section,
  photo: await resolveImageSource(section.photoUrl, section.photoFileId),
});

const toPublic = (section: ResolvedAboutFounderNote): PublicAboutFounderNote => ({
  founderName: section.founderName,
  founderRole: section.founderRole,
  companyLine: section.companyLine,
  quote: section.quote,
  body: section.body,
  photo: section.photo,
  /*
   * Not authored: the name and role stand in, so a portrait is never announced
   * unlabelled and there is no second field to keep in step with the person.
   *
   * There is deliberately no `initials` beside it. The card renders a monogram
   * when there is no photograph, and today the page prints a literal 'NM' - one
   * rule applied to the founder, while the team grid derives its own monogram
   * from the first letters of the first two words. Returning one of those two
   * answers as if it were the truth would silently change the card the first
   * time the section is published. Which letters to draw is a rendering decision
   * about a placeholder, and it stays with the component that draws it.
   */
  photoAlt: section.photo ? `${section.founderName}, ${section.founderRole}` : null,
});

const auditSnapshot = (section: AboutFounderNote): Record<string, unknown> => ({
  founderName: section.founderName,
  founderRole: section.founderRole,
  companyLine: section.companyLine,
  quote: section.quote,
  body: section.body,
  photoUrl: section.photoUrl,
  photoFileId: section.photoFileId,
});

/** The admin read. Null when the section has never been saved. */
export const get = async (): Promise<ResolvedAboutFounderNote | null> => {
  const section = await founderNoteRepository.find();
  return section ? toResolved(section) : null;
};

/** The website-facing read. 404 while nothing has been authored. */
export const getPublished = async (): Promise<PublicAboutFounderNote> => {
  const section = await founderNoteRepository.find();
  if (!section) throw new NotFoundError('About founder note');
  return toPublic(await toResolved(section));
};

export const replace = async (
  input: ReplaceAboutFounderNoteInput,
  context: RequestContext,
): Promise<ResolvedAboutFounderNote> => {
  if (input.photoFileId) {
    await assertUsableImageFile(
      input.photoFileId,
      ABOUT_IMAGE_SPECS.portrait,
      'photoFileId',
    );
  }

  const section = await withTransaction(async (client) => {
    const existing = await founderNoteRepository.findForUpdate(client);
    const saved = await founderNoteRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_FOUNDER_NOTE_UPDATED,
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
