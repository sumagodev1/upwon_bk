// src/modules/free-audit/services/applications.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { toInetOrNull, USER_AGENT_MAX } from '../../../core/utils/client-ip';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as applicationsRepository from '../repositories/applications.repository';
import {
  CreateFreeAuditApplicationInput,
  FreeAuditApplication,
  FreeAuditApplicationFilters,
  FreeAuditApplicationSummary,
} from '../types/applications.types';

const MODULE = 'free_audit';
const ENTITY = 'free_audit_application';

/**
 * What the audit row keeps of a deleted request: the shape of it, never the
 * person in it.
 *
 * audit_logs.old_values is returned verbatim by GET /audit-logs, and those
 * routes are guarded by audit_logs.read - a different permission from
 * free_audit_applications.read, deliberately, because reading this list is
 * reading strangers' names, mobile numbers and work addresses. Copying the whole
 * row in here on its way out would hand all of it to every role holding
 * audit_logs.read and quietly undo that separation. It would also make the
 * delete dialog's promise - permanently deleted - false, with the copy sitting
 * in a table that has no delete path of its own. This is the reasoning the
 * Partner Program and discovery call inboxes' snapshots follow.
 *
 * So, on the Partner Program's pattern: `company` - the business that asked,
 * not a person, and the one thing that makes "why was this deleted" answerable
 * - and the revenue chip, which is one of four fixed strings. The two fields the
 * visitor wrote in their own words are reduced to whether they were filled in at
 * all, never copied: `pain` in particular is up to 2000 characters of whatever
 * somebody chose to say about their business, which is the last thing that may
 * outlive the row. entityId ties the entry to the request that is gone.
 */
const auditSnapshot = (application: FreeAuditApplication): Record<string, unknown> => ({
  company: application.company,
  revenueRange: application.revenueRange,
  hadRole: application.role !== null,
  hadPain: application.pain !== null,
  receivedAt: application.createdAt,
});

// ── the public write ──────────────────────────────────────────────────────

/**
 * Files one request and returns its id.
 *
 * Nothing is read first: the hero is not consulted and the revenue chips are
 * fixed in code, so an unauthored hero does not stop somebody asking for an
 * audit. The discovery call and Partner Program forms work the same way.
 *
 * Not audited. audit_logs records what an administrator did; this is an
 * anonymous visitor, there is no actor to attribute it to, and the row in
 * free_audit_applications is itself the permanent record - a second copy in the
 * audit trail would only duplicate the personal data. The deletion of a request
 * IS audited, because that is an admin acting.
 */
export const submit = async (
  input: CreateFreeAuditApplicationInput,
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
 * free_audit_applications.read, which is where "who may see this" is decided.
 */
export const list = async (
  filters: FreeAuditApplicationFilters,
  pagination: PaginationParams,
): Promise<{ rows: FreeAuditApplicationSummary[]; meta: PaginationMeta }> => {
  const { rows, total } = await applicationsRepository.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<FreeAuditApplication> => {
  const application = await applicationsRepository.findById(id);
  if (!application) throw new NotFoundError('Free audit application');
  return application;
};

// ── admin delete ──────────────────────────────────────────────────────────

/**
 * A hard delete, with a non-identifying note of it written into the audit row.
 *
 * There is no status column to hide a row behind: a request is evidence of what
 * somebody sent, and a list that quietly keeps "deleted" requests is worse for
 * the person who asked to be forgotten than one that really deletes them. The
 * audit entry records that an admin removed request <id> - see auditSnapshot
 * for why it is not the row itself.
 */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await applicationsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Free audit application');

    await applicationsRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FREE_AUDIT_APPLICATION_DELETED,
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
