// src/modules/industry-pages/dairy-page/controllers/coverage-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/coverage-section.service';
import {
  validateDairyCoverageItemListQuery,
  validateDairyCoverageItemStatus,
  validateCreateDairyCoverageItem,
  validateReorderDairyCoverageItems,
  validateUpdateDairyCoverageItem,
} from '../validators/coverage-section.validator';

/** The Dairy & Ice Cream page's industry coverage categories. */

export const getAllDairyCoverageItemsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateDairyCoverageItemListQuery(req.query as Record<string, unknown>);
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Dairy & Ice Cream coverage categories retrieved successfully');
};

export const getDairyCoverageItemByIdController = async (req: Request, res: Response) => {
  const item = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, item, 'Dairy & Ice Cream coverage category retrieved successfully');
};

export const createDairyCoverageItemController = async (req: Request, res: Response) => {
  const dto = validateCreateDairyCoverageItem(req.body);
  const item = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, item, 'Dairy & Ice Cream coverage category created successfully');
};

export const updateDairyCoverageItemController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateDairyCoverageItem(req.body);
  const item = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, item, 'Dairy & Ice Cream coverage category updated successfully');
};

export const updateDairyCoverageItemStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateDairyCoverageItemStatus(req.body);
  const item = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    item,
    status === 'ACTIVE' ? 'Dairy & Ice Cream coverage category activated' : 'Dairy & Ice Cream coverage category deactivated',
  );
};

export const reorderDairyCoverageItemsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderDairyCoverageItems(req.body);
  const items = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, items, 'Dairy & Ice Cream coverage categories reordered successfully');
};

export const deleteDairyCoverageItemController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site then hides the section.
 */
export const getPublicDairyCoverageSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Dairy & Ice Cream industry coverage categories retrieved successfully');
};
