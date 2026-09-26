// src/modules/contact-page/services/contact-details.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as detailsRepository from '../repositories/contact-details.repository';
import {
  ContactDetailsSection,
  PublicContactDetailsSection,
  ReplaceContactDetailsSectionInput,
  ResolvedContactDetailsSection,
} from '../types/contact-details.types';

const MODULE = 'contact_page';
const ENTITY = 'contact_details_section';

// Nothing to resolve: no image, no heading markup. The identity function is
// kept so this service reads like the other two.
const toResolved = (section: ContactDetailsSection): ResolvedContactDetailsSection => section;

const toPublic = (section: ResolvedContactDetailsSection): PublicContactDetailsSection => ({
  officesTitle: section.officesTitle,
  offices: section.offices,
  directTitle: section.directTitle,
  email: section.email,
  phone: section.phone,
  // Served raw rather than as a wa.me URL: the card links it and shows it, and
  // the site strips the punctuation itself when it builds the link.
  whatsapp: section.whatsapp,
});

const auditSnapshot = (section: ContactDetailsSection): Record<string, unknown> => ({
  officesTitle: section.officesTitle,
  offices: section.offices,
  directTitle: section.directTitle,
  email: section.email,
  phone: section.phone,
  whatsapp: section.whatsapp,
});

/** The admin read. Null when the section has never been saved. */
export const get = async (): Promise<ResolvedContactDetailsSection | null> => {
  const section = await detailsRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read. Two outcomes, because these cards have no status:
 * the public shape, or a 404 when nothing has been authored - and the site then
 * keeps its own static copy, exactly as when the API is unreachable.
 */
export const getPublished = async (): Promise<PublicContactDetailsSection> => {
  const section = await detailsRepository.find();
  if (!section) throw new NotFoundError('Contact details section');
  return toPublic(toResolved(section));
};

export const replace = async (
  input: ReplaceContactDetailsSectionInput,
  context: RequestContext,
): Promise<ResolvedContactDetailsSection> => {
  const section = await withTransaction(async (client) => {
    const existing = await detailsRepository.findForUpdate(client);
    const saved = await detailsRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CONTACT_DETAILS_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        // Null on the first save: there was no section before it.
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
