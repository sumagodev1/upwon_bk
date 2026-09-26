// src/modules/contact-page/services/form-section.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading } from '../../home-page/utils/heading-markup';
import * as formRepository from '../repositories/form-section.repository';
import {
  ContactFormSection,
  PublicContactFormSection,
  ReplaceContactFormSectionInput,
  ResolvedContactFormSection,
} from '../types/form-section.types';

const MODULE = 'contact_page';
const ENTITY = 'contact_form_section';

// No image in this section, so "resolved" only means the parsed heading.
const toResolved = (section: ContactFormSection): ResolvedContactFormSection => ({
  ...section,
  headingLines: parseHeading(section.heading),
});

const toPublic = (section: ResolvedContactFormSection): PublicContactFormSection => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  headingLines: section.headingLines,
  businessTypes: section.businessTypes,
  revenueRanges: section.revenueRanges,
  platforms: section.platforms,
  footnote: section.footnote,
  successHeading: section.successHeading,
  successBody: section.successBody,
});

const auditSnapshot = (section: ContactFormSection): Record<string, unknown> => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  businessTypes: section.businessTypes,
  revenueRanges: section.revenueRanges,
  platforms: section.platforms,
  footnote: section.footnote,
  successHeading: section.successHeading,
  successBody: section.successBody,
});

/** The admin read. Null when the section has never been saved. */
export const get = async (): Promise<ResolvedContactFormSection | null> => {
  const section = await formRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read. Two outcomes, because the form has no status: the
 * public shape, or a 404 when nothing has been authored - and the site then
 * keeps its own static copy, exactly as when the API is unreachable.
 */
export const getPublished = async (): Promise<PublicContactFormSection> => {
  const section = await formRepository.find();
  if (!section) throw new NotFoundError('Contact form section');
  return toPublic(toResolved(section));
};

export const replace = async (
  input: ReplaceContactFormSectionInput,
  context: RequestContext,
): Promise<ResolvedContactFormSection> => {
  const section = await withTransaction(async (client) => {
    const existing = await formRepository.findForUpdate(client);
    const saved = await formRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CONTACT_FORM_UPDATED,
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
