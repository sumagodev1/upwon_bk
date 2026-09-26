// src/modules/partner-program/services/applications.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { toInetOrNull, USER_AGENT_MAX } from '../../../core/utils/client-ip';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as applicationsRepository from '../repositories/applications.repository';
import {
  CreatePartnerApplicationInput,
  PartnerApplication,
  PartnerApplicationFilters,
  PartnerApplicationSummary,
} from '../types/applications.types';

const MODULE = 'partner_program';
const ENTITY = 'partner_program_application';

/**
 * What the audit row keeps of a deleted application: the shape of it, never the
 * person in it.
 *
 * audit_logs.old_values is returned verbatim by GET /audit-logs, and those
 * routes are guarded by audit_logs.read - a different permission from
 * partner_applications.read, deliberately, because reading this list is reading
 * strangers' names, mobile numbers and work addresses. Copying the whole row in
 * here on its way out would hand all of it to every role holding audit_logs.read
 * and quietly undo that separation. It would also make the delete dialog's
 * promise - permanently deleted - false, with the copy sitting in a table that
 * has no delete path of its own, which is worse for somebody who asked to be
 * forgotten than never having promised. This is the reasoning the Contact
 * enquiry inbox's snapshot follows.
 *
 * So: enough to make sense of the entry months later, and entityId to tie it to
 * the application that is gone. Nothing here re-identifies the applicant -
 * `company` is the firm that applied, not a person, and it is the one thing that
 * makes "why was this deleted" answerable.
 *
 * Both fields the applicant wrote in their own words are reduced to whether they
 * were filled in at all, never copied. `background` is 160 characters of
 * whatever somebody chose to say about themselves - a name, a firm, a GSTIN, a
 * town - so it is the last thing that may outlive the row in a table with no
 * delete path.
 */
const auditSnapshot = (application: PartnerApplication): Record<string, unknown> => ({
  company: application.company,
  hadRole: application.role !== null,
  hadBackground: application.background !== null,
  receivedAt: application.createdAt,
});

// ── the public write ──────────────────────────────────────────────────────

/**
 * Files one application and returns its id.
 *
 * Nothing is read first, unlike the Contact enquiry submit: that one loads the
 * published choices to check three fields against them, and this form has no
 * choices - so an unauthored hero section does not stop a partner applying.
 *
 * Not audited. audit_logs records what an administrator did; this is an
 * anonymous visitor, there is no actor to attribute it to, and the row in
 * partner_program_applications is itself the permanent record - a second copy in
 * the audit trail would only duplicate the personal data. The deletion of an
 * application IS audited, because that is an admin acting.
 */
export const submit = async (
  input: CreatePartnerApplicationInput,
  context: RequestContext,
): Promise<string> =>
  applicationsRepository.insert(input, {
    ip: toInetOrNull(context.ipAddress),
    userAgent: context.userAgent?.slice(0, USER_AGENT_MAX) ?? null,
  });

// ── admin reads ───────────────────────────────────────────────────────────

/**
 * Reads are not audited. A list that wrote an audit row every time somebody
 * scrolled it would bury the entries that matter - and it is guarded by
 * partner_applications.read, which is where "who may see this" is decided.
 */
export const list = async (
  filters: PartnerApplicationFilters,
  pagination: PaginationParams,
): Promise<{ rows: PartnerApplicationSummary[]; meta: PaginationMeta }> => {
  const { rows, total } = await applicationsRepository.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<PartnerApplication> => {
  const application = await applicationsRepository.findById(id);
  if (!application) throw new NotFoundError('Partner Program application');
  return application;
};

// ── admin delete ──────────────────────────────────────────────────────────

/**
 * A hard delete, with a non-identifying note of it written into the audit row.
 *
 * There is no status column to hide a row behind: an application is evidence of
 * what somebody sent, and a list that quietly keeps "deleted" applicants is
 * worse for the person who asked to be forgotten than one that really deletes
 * them. The audit entry records that an admin removed application <id> and
 * roughly what it was - see auditSnapshot for why it is not the row itself.
 */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await applicationsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Partner Program application');

    await applicationsRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.PARTNER_APPLICATION_DELETED,
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
