// src/modules/careers/services/applications.service.ts

import { withTransaction } from '../../../config/database';
import { ApplicationStatus, AUDIT_ACTIONS } from '../../../config/constants';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { toInetOrNull, USER_AGENT_MAX } from '../../../core/utils/client-ip';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as applicationsRepository from '../repositories/applications.repository';
import * as vacanciesRepository from '../repositories/vacancies.repository';
import {
  CareerApplication,
  CareerApplicationFilters,
  CareerApplicationSummary,
  CreateCareerApplicationInput,
  ResumeUpload,
} from '../types/applications.types';
import {
  discardStoredResume,
  readResume,
  recordResumeFile,
  RESUME_ENTITY_TYPE,
  storeResume,
} from '../utils/resume-asset';

const MODULE = 'careers';
const ENTITY = 'career_application';

// ── the public write ──────────────────────────────────────────────────────

/**
 * Files one application and returns its id.
 *
 * Not audited. audit_logs records what an administrator did; this is an
 * anonymous applicant, there is no actor to attribute it to, and the row in
 * career_applications is itself the permanent record - a second copy in the
 * audit trail would only duplicate the personal data. The status changes and
 * the resume downloads that follow ARE audited, because those are admins
 * acting.
 *
 * Order of operations, and why:
 *
 *   1. The vacancy is checked first, before a byte is written. An application
 *      to a role that is not published is refused, so an unpublished vacancy's
 *      id - which anyone who loaded the page while it was live still has -
 *      cannot be used to keep applying after it was taken down. It also means
 *      the commonest rejection costs no storage.
 *   2. The blob is written next, outside the transaction, mirroring
 *      fileService.upload: the reverse order would leave a database row
 *      pointing at a file that does not exist, which is the worse failure.
 *   3. The files row and the application row go in together. If either fails,
 *      the transaction rolls back and the orphaned blob is removed in the
 *      catch - so there is never a stored CV that no application refers to.
 *
 * The advertised title is copied from the vacancy this function just read, not
 * from the request. An anonymous caller does not get to choose what their
 * application says they applied for.
 */
export const submit = async (
  input: CreateCareerApplicationInput,
  resume: ResumeUpload,
  context: RequestContext,
): Promise<string> => {
  const vacancy = await vacanciesRepository.findPublishedById(input.vacancyId);
  if (!vacancy) {
    throw new ValidationError('That role is no longer open', [
      {
        field: 'vacancyId',
        message: 'This vacancy is not open for applications',
        code: 'VACANCY_NOT_OPEN',
      },
    ]);
  }

  const stored = await storeResume(resume);

  try {
    return await withTransaction(async (client) => {
      const file = await recordResumeFile(
        {
          storageKey: stored.storageKey,
          originalName: resume.fileName,
          mimeType: resume.mimeType,
          sizeBytes: stored.sizeBytes,
          provider: stored.provider,
          entityType: RESUME_ENTITY_TYPE,
          // No entity id: the application points at the file, and writing the
          // link back would need a second statement after the application
          // exists, which can fail for no benefit.
          entityId: null,
          // Nobody signed in uploaded this.
          uploadedBy: null,
        },
        client,
      );

      return applicationsRepository.insert(
        input,
        {
          vacancyTitleSnapshot: vacancy.title,
          resumeFileId: file.id,
          ip: toInetOrNull(context.ipAddress),
          userAgent: context.userAgent?.slice(0, USER_AGENT_MAX) ?? null,
        },
        client,
      );
    });
  } catch (error) {
    await discardStoredResume(stored.storageKey);
    throw error;
  }
};

// ── admin reads ───────────────────────────────────────────────────────────

/**
 * Reads are not audited. An inbox that wrote an audit row every time somebody
 * scrolled it would bury the entries that matter - and the list is guarded by
 * career_applications.read, which is where "who may see this" is decided.
 * Opening the CV itself is the one exception; see downloadResume.
 */
export const list = async (
  filters: CareerApplicationFilters,
  pagination: PaginationParams,
): Promise<{ rows: CareerApplicationSummary[]; meta: PaginationMeta }> => {
  const { rows, total } = await applicationsRepository.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<CareerApplication> => {
  const application = await applicationsRepository.findById(id);
  if (!application) throw new NotFoundError('Application');
  return application;
};

/**
 * Reads the stored CV back, and records that it happened.
 *
 * The audit entry deliberately carries no personal data - not the candidate's
 * name, not the filename, which is usually their name. audit_logs.old_values
 * and new_values are returned verbatim by GET /audit-logs, guarded by
 * audit_logs.read, which is a different permission from
 * career_applications.read precisely because reading this inbox is reading
 * strangers' CVs. The entity id ties the entry to the application for anyone
 * who holds both.
 *
 * The file id is not taken from the request. It is read from the application,
 * so this route cannot be pointed at any other upload in the files table, and
 * readResume refuses anything that is not tagged as a resume even then.
 */
export const downloadResume = async (
  id: string,
  context: RequestContext,
): Promise<{ fileName: string; mimeType: string; buffer: Buffer }> => {
  const application = await getById(id);
  if (!application.resume) throw new NotFoundError('Resume');

  const stored = await readResume(application.resume.fileId);
  if (!stored) throw new NotFoundError('Resume');

  await auditLogService.record(
    {
      action: AUDIT_ACTIONS.CAREER_RESUME_DOWNLOADED,
      module: MODULE,
      entityType: ENTITY,
      entityId: id,
      newValues: { vacancyTitle: application.vacancyTitle },
    },
    context,
  );

  return {
    fileName: stored.file.originalName,
    mimeType: stored.file.mimeType,
    buffer: stored.buffer,
  };
};

// ── admin write ───────────────────────────────────────────────────────────

/**
 * Moves one application along the funnel. The only write an administrator has
 * on this table - see the repository for why.
 */
export const setStatus = async (
  id: string,
  status: ApplicationStatus,
  context: RequestContext,
): Promise<CareerApplication> => {
  await withTransaction(async (client) => {
    const existing = await applicationsRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Application');

    // A no-op save writes neither a row nor an audit entry.
    if (existing.status === status) return;

    const changed = await applicationsRepository.updateStatus(
      id,
      status,
      context.adminId,
      client,
    );
    if (!changed) throw new NotFoundError('Application');

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.CAREER_APPLICATION_STATUS_CHANGED,
        module: MODULE,
        entityType: ENTITY,
        entityId: id,
        // The status and nothing else: the candidate's own answers are not
        // changing, and copying them into the audit trail would hand them to
        // every role holding audit_logs.read.
        oldValues: { status: existing.status },
        newValues: { status },
      },
      context,
      client,
    );
  });

  return getById(id);
};
