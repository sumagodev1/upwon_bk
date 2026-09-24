// src/modules/product-pages/sfa-dms-page/controllers/outcomes-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/outcomes-section.service';
import {
  validateCreateSfaOutcomeCard,
  validateSfaOutcomeCardListQuery,
  validateSfaOutcomeCardReorder,
  validateSfaOutcomeStatusBody,
  validateUpdateSfaOutcomeCard,
  validateUpsertSfaOutcomeSection,
} from '../validators/outcomes-section.validator';

/** The SFA-DMS page's customer stories: the two buttons, and the carousel. */

// ── the two buttons ───────────────────────────────────────────────────────

/**
 * Returns 200 with a null body when the buttons have never been authored,
 * rather than a 404 - that is a normal first-run answer, and the form treats it
 * as an empty state instead of an error.
 */
export const getSfaOutcomeSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Section buttons retrieved successfully');
};

export const updateSfaOutcomeSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertSfaOutcomeSection(req.body);
  const section = await service.upsertSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Section buttons saved successfully');
};

// ── the story cards ───────────────────────────────────────────────────────

export const getAllSfaOutcomeCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSfaOutcomeCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listCards(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Stories retrieved successfully');
};

export const getSfaOutcomeCardByIdController = async (req: Request, res: Response) => {
  const card = await service.getCardById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'Story retrieved successfully');
};

export const createSfaOutcomeCardController = async (req: Request, res: Response) => {
  const dto = validateCreateSfaOutcomeCard(req.body);
  const card = await service.createCard(dto, buildContext(req));
  return ApiResponse.created(res, card, 'Story created successfully');
};

export const updateSfaOutcomeCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaOutcomeCard(req.body);
  const card = await service.updateCard(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'Story updated successfully');
};

export const updateSfaOutcomeCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaOutcomeStatusBody(req.body);
  const card = await service.setCardStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'Story activated' : 'Story deactivated',
  );
};

export const reorderSfaOutcomeCardsController = async (req: Request, res: Response) => {
  const { ids } = validateSfaOutcomeCardReorder(req.body);
  const cards = await service.reorderCards(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'Stories reordered successfully');
};

export const deleteSfaOutcomeCardController = async (req: Request, res: Response) => {
  await service.removeCard(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSfaOutcomesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Customer stories retrieved successfully');
};
