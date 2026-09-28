// src/modules/industry-pages/food-processing-page/controllers/coverage-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/coverage-section.service';
import {
  validateFoodProcessingCoverageItemListQuery,
  validateFoodProcessingCoverageItemStatus,
  validateCreateFoodProcessingCoverageItem,
  validateReorderFoodProcessingCoverageItems,
  validateUpdateFoodProcessingCoverageItem,
} from '../validators/coverage-section.validator';

/** The Food Processing page's industry coverage categories. */

export const getAllFoodProcessingCoverageItemsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFoodProcessingCoverageItemListQuery(req.query as Record<string, unknown>);
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Food Processing coverage categories retrieved successfully');
};

export const getFoodProcessingCoverageItemByIdController = async (req: Request, res: Response) => {
  const item = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, item, 'Food Processing coverage category retrieved successfully');
};

export const createFoodProcessingCoverageItemController = async (req: Request, res: Response) => {
  const dto = validateCreateFoodProcessingCoverageItem(req.body);
  const item = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, item, 'Food Processing coverage category created successfully');
};

export const updateFoodProcessingCoverageItemController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFoodProcessingCoverageItem(req.body);
  const item = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, item, 'Food Processing coverage category updated successfully');
};

export const updateFoodProcessingCoverageItemStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFoodProcessingCoverageItemStatus(req.body);
  const item = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    item,
    status === 'ACTIVE' ? 'Food Processing coverage category activated' : 'Food Processing coverage category deactivated',
  );
};

export const reorderFoodProcessingCoverageItemsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderFoodProcessingCoverageItems(req.body);
  const items = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, items, 'Food Processing coverage categories reordered successfully');
};

export const deleteFoodProcessingCoverageItemController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site then hides the section.
 */
export const getPublicFoodProcessingCoverageSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Food Processing industry coverage categories retrieved successfully');
};
