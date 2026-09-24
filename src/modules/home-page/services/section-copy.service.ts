// src/modules/home-page/services/section-copy.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, PageKey, SectionKey } from '../../../config/constants';
import { Executor } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as sectionCopyRepository from '../repositories/section-copy.repository';
import { parseHeading } from '../utils/heading-markup';
import {
  ResolvedSectionCopy,
  SectionCopy,
  UpsertSectionCopyInput,
} from '../types/section-copy.types';

const MODULE = 'home_page';
const ENTITY = 'home_section_copy';

const toResolved = (copy: SectionCopy): ResolvedSectionCopy => ({
  ...copy,
  headingLines: parseHeading(copy.heading),
});

/**
 * The section's copy, or null when it has never been authored.
 *
 * Null rather than a throw: a section with no copy yet is a normal state on a
 * fresh install, and both callers - the panel's form and each section's public
 * read - have something sensible to do with it.
 */
export const get = async (
  pageKey: PageKey,
  sectionKey: SectionKey,
  executor?: Executor,
): Promise<ResolvedSectionCopy | null> => {
  const copy = await sectionCopyRepository.findByKey(pageKey, sectionKey, executor);
  return copy ? toResolved(copy) : null;
};

/** The same read, but for callers that treat missing copy as an error. */
export const getOrFail = async (
  pageKey: PageKey,
  sectionKey: SectionKey,
): Promise<ResolvedSectionCopy> => {
  const copy = await get(pageKey, sectionKey);
  if (!copy) throw new NotFoundError('Section copy');
  return copy;
};

export const upsert = async (
  pageKey: PageKey,
  sectionKey: SectionKey,
  input: UpsertSectionCopyInput,
  context: RequestContext,
): Promise<ResolvedSectionCopy> => {
  const copy = await withTransaction(async (client) => {
    const existing = await sectionCopyRepository.findByKey(pageKey, sectionKey, client);
    const saved = await sectionCopyRepository.upsert(
      pageKey,
      sectionKey,
      input,
      context.adminId,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.HOME_SECTION_COPY_UPDATED,
        module: MODULE,
        entityType: ENTITY,
        entityId: `${pageKey}.${sectionKey}`,
        oldValues: existing
          ? { eyebrow: existing.eyebrow, heading: existing.heading }
          : undefined,
        newValues: { eyebrow: saved.eyebrow, heading: saved.heading },
      },
      context,
      client,
    );

    return saved;
  });

  return toResolved(copy);
};
