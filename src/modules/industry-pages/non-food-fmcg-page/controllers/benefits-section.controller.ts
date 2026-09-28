// src/modules/industry-pages/non-food-fmcg-page/controllers/benefits-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/benefits-section.service';
import { NON_FOOD_FMCG_ICON_NAMES } from '../utils/icons';
import {
  validateNonFoodFmcgBenefitItemListQuery,
  validateNonFoodFmcgBenefitItemStatus,
  validateCreateNonFoodFmcgBenefitItem,
  validateReorderNonFoodFmcgBenefitItems,
  validateUpdateNonFoodFmcgBenefitItem,
} from '../validators/benefits-section.validator';

/** The Non-Food FMCG page's benefits. */

/**
 * The icons an item may use. Served so the picker offers exactly what the
 * validator accepts.
 */
export const getNonFoodFmcgBenefitsIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, NON_FOOD_FMCG_ICON_NAMES, 'Available icons retrieved successfully');

export const getAllNonFoodFmcgBenefitItemsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateNonFoodFmcgBenefitItemListQuery(req.query as Record<string, unknown>);
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Non-Food FMCG benefits retrieved successfully');
};

export const getNonFoodFmcgBenefitItemByIdController = async (req: Request, res: Response) => {
  const item = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, item, 'Non-Food FMCG benefit retrieved successfully');
};

export const createNonFoodFmcgBenefitItemController = async (req: Request, res: Response) => {
  const dto = validateCreateNonFoodFmcgBenefitItem(req.body);
  const item = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, item, 'Non-Food FMCG benefit created successfully');
};

export const updateNonFoodFmcgBenefitItemController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateNonFoodFmcgBenefitItem(req.body);
  const item = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, item, 'Non-Food FMCG benefit updated successfully');
};

export const updateNonFoodFmcgBenefitItemStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateNonFoodFmcgBenefitItemStatus(req.body);
  const item = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    item,
    status === 'ACTIVE' ? 'Non-Food FMCG benefit activated' : 'Non-Food FMCG benefit deactivated',
  );
};

export const reorderNonFoodFmcgBenefitItemsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderNonFoodFmcgBenefitItems(req.body);
  const items = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, items, 'Non-Food FMCG benefits reordered successfully');
};

export const deleteNonFoodFmcgBenefitItemController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site then hides the section.
 */
export const getPublicNonFoodFmcgBenefitsSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Non-Food FMCG benefits retrieved successfully');
};
