// src/modules/about-page/services/discovery-calls.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { toInetOrNull, USER_AGENT_MAX } from '../../../core/utils/client-ip';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as callsRepository from '../repositories/discovery-calls.repository';
import {
  AboutDiscoveryCall,
  AboutDiscoveryCallFilters,
  AboutDiscoveryCallSummary,
  CreateAboutDiscoveryCallInput,
} from '../types/discovery-calls.types';

const MODULE = 'about_page';
const ENTITY = 'about_discovery_call';

/**
 * What the audit row keeps of a deleted booking: that there was one, never the
 * person in it.
 *
 * audit_logs.old_values is returned verbatim by GET /audit-logs, and those routes
 * are guarded by audit_logs.read - a different permission from
 * discovery_calls.read, deliberately, because reading this list is reading
 * strangers' names and mobile numbers. Copying the row in here on its way out
 * would hand all of it to every role holding audit_logs.read and quietly undo
 * that separation. It would also make the delete dialog's promise - permanently
 * deleted - false, with the copy sitting in a table that has no delete path of
 * its own, which is worse for somebody who asked to be forgotten than never
 * having promised. This is the reasoning the Contact and Partner Program inboxes'
 * snapshots follow.
 *
 * This booking has three fields and every one of them is about the person: a
 * name, the number to ring, and the business they mentioned. There is nothing
 * here that is safe to keep and also worth keeping, unlike a partner
 * application's company - so the snapshot records only that the row existed,
 * whether the optional field was filled in, and when it arrived. entityId ties
 * the entry to the booking that is gone.
 */
const auditSnapshot = (call: AboutDiscoveryCall): Record<string, unknown> => ({
  hadBusiness: call.business !== null,
  receivedAt: call.createdAt,
});

// ── the public write ──────────────────────────────────────────────────────

/**
 * Files one booking and returns its id.
 *
 * Nothing is read first: no section is consulted, so an unauthored About page
 * does not stop somebody asking for a call. The Partner Program form works the
 * same way and for the same reason - there are no published choices to check the
 * body against.
 *
 * Not audited. audit_logs records what an administrator did; this is an anonymous
 * visitor, there is no actor to attribute it to, and the row in
 * about_discovery_calls is itself the permanent record - a second copy in the
 * audit trail would only duplicate the personal data. The deletion of a booking
 * IS audited, because that is an admin acting.
 */
export const submit = async (
  input: CreateAboutDiscoveryCallInput,
  context: RequestContext,
): Promise<string> =>
  callsRepository.insert(input, {
    ip: toInetOrNull(context.ipAddress),
    userAgent: context.userAgent?.slice(0, USER_AGENT_MAX) ?? null,
  });

// ── admin reads ───────────────────────────────────────────────────────────

/**
 * Reads are not audited. A list that wrote an audit row every time somebody
 * scrolled it would bury the entries that matter - and it is guarded by
 * discovery_calls.read, which is where "who may see this" is decided.
 */
export const list = async (
  filters: AboutDiscoveryCallFilters,
  pagination: PaginationParams,
): Promise<{ rows: AboutDiscoveryCallSummary[]; meta: PaginationMeta }> => {
  const { rows, total } = await callsRepository.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<AboutDiscoveryCall> => {
  const call = await callsRepository.findById(id);
  if (!call) throw new NotFoundError('Discovery call');
  return call;
};

// ── admin delete ──────────────────────────────────────────────────────────

/**
 * A hard delete, with a non-identifying note of it written into the audit row.
 *
 * There is no status column to hide a row behind: a booking is evidence of what
 * somebody sent, and a list that quietly keeps "deleted" callers is worse for the
 * person who asked to be forgotten than one that really deletes them. The audit
 * entry records that an admin removed booking <id> - see auditSnapshot for why it
 * is not the row itself.
 */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await callsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Discovery call');

    await callsRepository.remove(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ABOUT_DISCOVERY_CALL_DELETED,
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
