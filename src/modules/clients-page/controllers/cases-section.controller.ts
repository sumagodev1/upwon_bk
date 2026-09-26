// src/modules/clients-page/controllers/cases-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import * as service from '../services/cases-section.service';
import {
  validateClientsCaseCardListQuery,
  validateClientsCaseCardStatus,
  validateCreateClientsCaseCard,
  validateReorderClientsCaseCards,
  validateSectionParam,
  validateUpdateClientsCaseCard,
} from '../validators/cases-section.validator';

/** The Clients page's featured case study cards, and the stories behind them. */

/** A malformed slug cannot match a row, so it is answered like a missing one. */
const validateSlugParam = (raw: unknown): string => {
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    throw new NotFoundError('Case study');
  }
  return slug;
};

export const getAllClientsCaseCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateClientsCaseCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Case cards retrieved successfully');
};

export const getClientsCaseCardByIdController = async (req: Request, res: Response) => {
  const card = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'Case card retrieved successfully');
};

export const createClientsCaseCardController = async (req: Request, res: Response) => {
  const dto = validateCreateClientsCaseCard(req.body);
  const card = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, card, 'Case card created successfully');
};

export const updateClientsCaseCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateClientsCaseCard(req.body);
  const card = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'Case card updated successfully');
};

export const updateClientsCaseCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateClientsCaseCardStatus(req.body);
  const card = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'Case card published' : 'Case card unpublished',
  );
};

/** Switches one story section on or off: PUT /:id/sections/:section/status. */
export const updateClientsCaseSectionStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const section = validateSectionParam(req.params.section);
  const { status } = validateClientsCaseCardStatus(req.body);
  const card = await service.setSectionStatus(id, section, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'Section switched on' : 'Section switched off',
  );
};

export const reorderClientsCaseCardsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderClientsCaseCards(req.body);
  const cards = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'Case cards reordered successfully');
};

export const deleteClientsCaseCardController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy and every active card in one response.
 * 200 with a null body when nothing is published - the site then keeps its own.
 */
export const getPublicClientsCasesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Case studies retrieved successfully');
};

/**
 * The website-facing story at /clients/<slug>. Unauthenticated; a 404 when no
 * published case study has that slug.
 */
export const getPublicClientsCaseStoryController = async (req: Request, res: Response) => {
  const story = await service.getPublishedStory(validateSlugParam(req.params.slug));
  return ApiResponse.success(res, story, 'Case study retrieved successfully');
};
