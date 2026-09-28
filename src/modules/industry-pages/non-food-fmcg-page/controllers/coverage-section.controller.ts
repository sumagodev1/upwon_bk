// src/modules/industry-pages/non-food-fmcg-page/controllers/coverage-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/coverage-section.service';
import { NON_FOOD_FMCG_ICON_NAMES } from '../utils/icons';
import {
  validateNonFoodFmcgCoverageItemListQuery,
  validateNonFoodFmcgCoverageItemStatus,
  validateCreateNonFoodFmcgCoverageItem,
  validateReorderNonFoodFmcgCoverageItems,
  validateUpsertNonFoodFmcgCoveragePanel,
  validateUpdateNonFoodFmcgCoverageItem,
} from '../validators/coverage-section.validator';

/** The Non-Food FMCG page's industry coverage categories. */

/**
 * The icons an item may use. Served so the picker offers exactly what the
 * validator accepts.
 */
export const getNonFoodFmcgCoverageIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, NON_FOOD_FMCG_ICON_NAMES, 'Available icons retrieved successfully');

export const getAllNonFoodFmcgCoverageItemsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateNonFoodFmcgCoverageItemListQuery(req.query as Record<string, unknown>);
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Non-Food FMCG coverage categories retrieved successfully');
};

export const getNonFoodFmcgCoverageItemByIdController = async (req: Request, res: Response) => {
  const item = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, item, 'Non-Food FMCG coverage category retrieved successfully');
};

export const createNonFoodFmcgCoverageItemController = async (req: Request, res: Response) => {
  const dto = validateCreateNonFoodFmcgCoverageItem(req.body);
  const item = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, item, 'Non-Food FMCG coverage category created successfully');
};

export const updateNonFoodFmcgCoverageItemController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateNonFoodFmcgCoverageItem(req.body);
  const item = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, item, 'Non-Food FMCG coverage category updated successfully');
};

export const updateNonFoodFmcgCoverageItemStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateNonFoodFmcgCoverageItemStatus(req.body);
  const item = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    item,
    status === 'ACTIVE' ? 'Non-Food FMCG coverage category activated' : 'Non-Food FMCG coverage category deactivated',
  );
};

export const reorderNonFoodFmcgCoverageItemsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderNonFoodFmcgCoverageItems(req.body);
  const items = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, items, 'Non-Food FMCG coverage categories reordered successfully');
};

export const deleteNonFoodFmcgCoverageItemController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the panel image ───────────────────────────────────────────────────────

/** 200 with a null body when never authored - the form treats that as empty. */
export const getNonFoodFmcgCoveragePanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Non-Food FMCG panel retrieved successfully');
};

export const upsertNonFoodFmcgCoveragePanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertNonFoodFmcgCoveragePanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Non-Food FMCG panel saved successfully');
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site then hides the section.
 */
export const getPublicNonFoodFmcgCoverageSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Non-Food FMCG industry coverage categories retrieved successfully');
};
