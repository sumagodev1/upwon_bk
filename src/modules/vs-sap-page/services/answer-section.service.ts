// src/modules/vs-sap-page/services/answer-section.service.ts

import { AUDIT_ACTIONS } from '../../../config/constants';
import { withTransaction } from '../../../config/database';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { parseHeading } from '../../home-page/utils/heading-markup';
import * as answerRepository from '../repositories/answer-section.repository';
import {
  PublicVsSapAnswerSection,
  ReplaceVsSapAnswerSectionInput,
  ResolvedVsSapAnswerSection,
  VsSapAnswerSection,
} from '../types/answer-section.types';

const MODULE = 'vs_sap_page';
const ENTITY = 'vs_sap_answer_section';

const toResolved = (section: VsSapAnswerSection): ResolvedVsSapAnswerSection => ({
  ...section,
  headingLines: parseHeading(section.heading),
});

/** Every authored field, so a save's old and new copy are both in the trail. */
const auditSnapshot = (section: VsSapAnswerSection): Record<string, unknown> => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  upwonTitle: section.upwonTitle,
  upwonPoints: section.upwonPoints,
  sapTitle: section.sapTitle,
  sapPoints: section.sapPoints,
  closingLine: section.closingLine,
});

/** The admin read. Null when the section has never been saved. */
export const get = async (): Promise<ResolvedVsSapAnswerSection | null> => {
  const section = await answerRepository.find();
  return section ? toResolved(section) : null;
};

/**
 * The website-facing read: the copy with its heading parsed, so the site maps
 * over headingLines rather than interpreting the ** markers itself.
 *
 * 404 while the section has never been authored, so the site keeps its
 * built-in cards - exactly as when the API is unreachable.
 */
export const getPublished = async (): Promise<PublicVsSapAnswerSection> => {
  const section = await answerRepository.find();
  if (!section) throw new NotFoundError('UpWon vs SAP straight answer section');

  const resolved = toResolved(section);
  return {
    eyebrow: resolved.eyebrow,
    heading: resolved.heading,
    headingLines: resolved.headingLines,
    upwonTitle: resolved.upwonTitle,
    upwonPoints: resolved.upwonPoints,
    sapTitle: resolved.sapTitle,
    sapPoints: resolved.sapPoints,
    closingLine: resolved.closingLine,
  };
};

export const replace = async (
  input: ReplaceVsSapAnswerSectionInput,
  context: RequestContext,
): Promise<ResolvedVsSapAnswerSection> => {
  const section = await withTransaction(async (client) => {
    const existing = await answerRepository.findForUpdate(client);
    const saved = await answerRepository.upsert(input, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.VS_SAP_ANSWER_SECTION_UPDATED,
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
