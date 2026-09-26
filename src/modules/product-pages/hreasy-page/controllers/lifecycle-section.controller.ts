// src/modules/product-pages/hreasy-page/controllers/lifecycle-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as lifecycleService from '../services/lifecycle-section.service';
import {
  validateCreateHreasyLifecycleCard,
  validateHreasyLifecycleCardListQuery,
  validateHreasyLifecycleCardStatus,
  validateReorderHreasyLifecycleCards,
  validateUpdateHreasyLifecycleCard,
} from '../validators/lifecycle-section.validator';

/**
 * The HREasy page's capability card grid.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

export const getAllHreasyLifecycleCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateHreasyLifecycleCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await lifecycleService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'HREasy lifecycle cards retrieved successfully');
};

export const getHreasyLifecycleCardByIdController = async (req: Request, res: Response) => {
  const card = await lifecycleService.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'HREasy lifecycle card retrieved successfully');
};

export const createHreasyLifecycleCardController = async (req: Request, res: Response) => {
  const dto = validateCreateHreasyLifecycleCard(req.body);
  const card = await lifecycleService.create(dto, buildContext(req));
  return ApiResponse.created(res, card, 'HREasy lifecycle card created successfully');
};

export const updateHreasyLifecycleCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyLifecycleCard(req.body);
  const card = await lifecycleService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'HREasy lifecycle card updated successfully');
};

export const updateHreasyLifecycleCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyLifecycleCardStatus(req.body);
  const card = await lifecycleService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'HREasy lifecycle card activated' : 'HREasy lifecycle card deactivated',
  );
};

export const reorderHreasyLifecycleCardsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderHreasyLifecycleCards(req.body);
  const cards = await lifecycleService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'HREasy lifecycle cards reordered successfully');
};

export const deleteHreasyLifecycleCardController = async (req: Request, res: Response) => {
  await lifecycleService.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/** The website-facing read: the section's copy and its active cards. */
export const getPublicHreasyLifecycleSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await lifecycleService.getPublished();
  return ApiResponse.success(res, section, 'HREasy lifecycle section retrieved successfully');
};
