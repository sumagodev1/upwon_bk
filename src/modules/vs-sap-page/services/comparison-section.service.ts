// src/modules/vs-sap-page/services/comparison-section.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as capabilitiesRepository from '../repositories/capabilities.repository';
import * as sectionRepository from '../repositories/comparison-section.repository';
import {
  PublicVsSapComparisonSection,
  ReplaceVsSapComparisonSectionInput,
  VsSapComparisonSection,
} from '../types/comparison.types';
import { toPublicCapability } from './capabilities.service';

const MODULE = 'vs_sap_page';
const ENTITY = 'vs_sap_comparison_section';

const auditSnapshot = (section: VsSapComparisonSection): Record<string, unknown> => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  subtext: section.subtext,
  tcoUpwon: section.tcoUpwon,
  tcoSap: section.tcoSap,
  tcoNetsuite: section.tcoNetsuite,
});

/**
 * The admin read of the table's copy. Null when it has never been saved. The
 * heading is plain text, so there is no parsed form to add.
 */
export const get = async (): Promise<VsSapComparisonSection | null> =>
  sectionRepository.find();

/**
 * The website-facing read: the copy, the TCO row and the ACTIVE capability rows
 * under it, in display order, in one response - the page renders them as one
 * table.
 *
 * 404 while the copy has never been authored, so the site keeps its built-in
 * table - exactly as when the API is unreachable. An authored section with no
 * ACTIVE rows returns capabilities: [], which is what somebody chose when they
 * unpublished the last one.
 *
 * `hasCapabilities` counts the rows regardless of status, so the site can tell
 * that second answer from "there is no capability row at all" - see the About
 * page's Number section service for the full argument. The stakes are the same
 * here: a rating is a claim about a competitor, and one taken down because it is
 * no longer defensible must not reappear because the list it was in became
 * empty.
 */
export const getPublished = async (): Promise<PublicVsSapComparisonSection> => {
  const section = await sectionRepository.find();
  if (!section) throw new NotFoundError('UpWon vs SAP capability comparison section');

  const [capabilities, total] = await Promise.all([
    capabilitiesRepository.findPublished(),
    capabilitiesRepository.count(),
  ]);

  return {
    eyebrow: section.eyebrow,
    heading: section.heading,
    subtext: section.subtext,
    tco: {
      upwon: section.tcoUpwon,
      sap: section.tcoSap,
      netsuite: section.tcoNetsuite,
    },
    capabilities: capabilities.map(toPublicCapability),
    hasCapabilities: total > 0,
  };
};

export const replace = async (
  input: ReplaceVsSapComparisonSectionInput,
  context: RequestContext,
): Promise<VsSapComparisonSection> =>
  withTransaction(async (client) => {
    const existing = await sectionRepository.findForUpdate(client);
    const saved = await sectionRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VS_SAP_COMPARISON_SECTION_UPDATED,
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
