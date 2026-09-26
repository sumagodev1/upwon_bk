// src/modules/industry-pages/non-food-fmcg-page/controllers/capabilities-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/capabilities-section.service';
import {
  validateNonFoodFmcgCapabilityCardListQuery,
  validateNonFoodFmcgCapabilityCardStatus,
  validateCreateNonFoodFmcgCapabilityCard,
  validateReorderNonFoodFmcgCapabilityCards,
  validateUpdateNonFoodFmcgCapabilityCard,
} from '../validators/capabilities-section.validator';

/** The Non-Food FMCG page's core capabilities. */

export const getAllNonFoodFmcgCapabilityCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateNonFoodFmcgCapabilityCardListQuery(req.query as Record<string, unknown>);
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Non-Food FMCG capability cards retrieved successfully');
};

export const getNonFoodFmcgCapabilityCardByIdController = async (req: Request, res: Response) => {
  const item = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, item, 'Non-Food FMCG capability card retrieved successfully');
};

export const createNonFoodFmcgCapabilityCardController = async (req: Request, res: Response) => {
  const dto = validateCreateNonFoodFmcgCapabilityCard(req.body);
  const item = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, item, 'Non-Food FMCG capability card created successfully');
};

export const updateNonFoodFmcgCapabilityCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateNonFoodFmcgCapabilityCard(req.body);
  const item = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, item, 'Non-Food FMCG capability card updated successfully');
};

export const updateNonFoodFmcgCapabilityCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateNonFoodFmcgCapabilityCardStatus(req.body);
  const item = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    item,
    status === 'ACTIVE' ? 'Non-Food FMCG capability card activated' : 'Non-Food FMCG capability card deactivated',
  );
};

export const reorderNonFoodFmcgCapabilityCardsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderNonFoodFmcgCapabilityCards(req.body);
  const items = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, items, 'Non-Food FMCG capability cards reordered successfully');
};

export const deleteNonFoodFmcgCapabilityCardController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site then hides the section.
 */
export const getPublicNonFoodFmcgCapabilitiesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Non-Food FMCG core capabilities retrieved successfully');
};
