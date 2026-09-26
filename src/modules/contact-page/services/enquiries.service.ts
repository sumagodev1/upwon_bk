// src/modules/contact-page/services/enquiries.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { toInetOrNull, USER_AGENT_MAX } from '../../../core/utils/client-ip';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as enquiriesRepository from '../repositories/enquiries.repository';
import * as formRepository from '../repositories/form-section.repository';
import {
  ContactEnquiry,
  ContactEnquiryFilters,
  ContactEnquirySummary,
  CreateContactEnquiryInput,
  PublishedContactFormChoices,
} from '../types/enquiries.types';

const MODULE = 'contact_page';
const ENTITY = 'contact_enquiry';

/*
 * toInetOrNull and USER_AGENT_MAX moved to core/utils/client-ip.ts when the
 * Careers application form became the second public write storing a
 * submitter's address in an INET column. The reasoning lives there.
 */

/**
 * What the audit row keeps of a deleted enquiry: the shape of it, never the
 * person in it.
 *
 * audit_logs.old_values is returned verbatim by GET /audit-logs, and those
 * routes are guarded by audit_logs.read - a different permission from
 * contact_enquiries.read, deliberately, because reading this inbox is reading
 * strangers' names, addresses and phone numbers. Copying the whole row in here
 * on its way out would hand all of it to every role holding audit_logs.read
 * and quietly undo that separation. It would also make the delete dialog's
 * promise - permanently deleted, including everything they wrote - false, with
 * the copy sitting in a table that has no delete path of its own, which is
 * worse for somebody who asked to be forgotten than never having promised.
 *
 * So: enough to make sense of the entry months later, and entityId to tie it
 * to the enquiry that is gone. Nothing here re-identifies the sender.
 */
const auditSnapshot = (enquiry: ContactEnquiry): Record<string, unknown> => ({
  company: enquiry.company,
  businessType: enquiry.businessType,
  revenueRange: enquiry.revenueRange,
  platformCount: enquiry.platforms.length,
  messageLength: enquiry.message?.length ?? 0,
  receivedAt: enquiry.createdAt,
});

// ── the public write ──────────────────────────────────────────────────────

/**
 * The choices the form is publishing right now, for the submit validator.
 *
 * A 404 when the section has never been authored is the honest answer: the
 * website is then rendering its own static fallback copy, so the options on
 * screen are not ones this API can vouch for, and accepting the submission
 * would file labels no admin ever offered. The site shows its "could not
 * send" state, which is true.
 */
export const publishedChoices = async (): Promise<PublishedContactFormChoices> => {
  const section = await formRepository.find();
  if (!section) throw new NotFoundError('Contact form section');
  return {
    businessTypes: section.businessTypes,
    revenueRanges: section.revenueRanges,
    platforms: section.platforms,
  };
};

/**
 * Files one enquiry and returns its id.
 *
 * Not audited. audit_logs records what an administrator did; this is an
 * anonymous visitor, there is no actor to attribute it to, and the row in
 * contact_enquiries is itself the permanent record - a second copy in the
 * audit trail would only duplicate the personal data. The deletion of an
 * enquiry IS audited, because that is an admin acting.
 */
export const submit = async (
  input: CreateContactEnquiryInput,
  context: RequestContext,
): Promise<string> =>
  enquiriesRepository.insert(input, {
    ip: toInetOrNull(context.ipAddress),
    userAgent: context.userAgent?.slice(0, USER_AGENT_MAX) ?? null,
  });

// ── admin reads ───────────────────────────────────────────────────────────

/**
 * Reads are not audited. An inbox that wrote an audit row every time somebody
 * scrolled it would bury the entries that matter - and the list is guarded by
 * contact_enquiries.read, which is where "who may see this" is decided.
 */
export const list = async (
  filters: ContactEnquiryFilters,
  pagination: PaginationParams,
): Promise<{ rows: ContactEnquirySummary[]; meta: PaginationMeta }> => {
  const { rows, total } = await enquiriesRepository.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ContactEnquiry> => {
  const enquiry = await enquiriesRepository.findById(id);
  if (!enquiry) throw new NotFoundError('Contact enquiry');
  return enquiry;
};

// ── admin delete ──────────────────────────────────────────────────────────

/**
 * A hard delete, with a non-identifying note of it written into the audit row.
 *
 * There is no status column to hide a row behind: an enquiry is evidence of
 * what somebody sent, and an inbox that quietly keeps "deleted" leads is worse
 * for the person who asked to be forgotten than one that really deletes them.
 * The audit entry records that an admin removed enquiry <id> and roughly what
 * it was about - see auditSnapshot for why it is not the row itself.
 */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await enquiriesRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Contact enquiry');

    await enquiriesRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CONTACT_ENQUIRY_DELETED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        oldValues: auditSnapshot(existing),
      },
      context,
      client,
    );
  });
};
