// src/modules/industry-pages/food-processing-page/controllers/platform-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/platform-section.service';
import {
  validateFoodProcessingPlatformTileListQuery,
  validateFoodProcessingPlatformTileStatus,
  validateCreateFoodProcessingPlatformTile,
  validateReorderFoodProcessingPlatformTiles,
  validateUpdateFoodProcessingPlatformTile,
} from '../validators/platform-section.validator';

/** The Food Processing page's connected-platform tiles. */

export const getAllFoodProcessingPlatformTilesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFoodProcessingPlatformTileListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Food Processing platform tiles retrieved successfully');
};

export const getFoodProcessingPlatformTileByIdController = async (req: Request, res: Response) => {
  const tile = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tile, 'Food Processing platform tile retrieved successfully');
};

export const createFoodProcessingPlatformTileController = async (req: Request, res: Response) => {
  const dto = validateCreateFoodProcessingPlatformTile(req.body);
  const tile = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, tile, 'Food Processing platform tile created successfully');
};

export const updateFoodProcessingPlatformTileController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFoodProcessingPlatformTile(req.body);
  const tile = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, tile, 'Food Processing platform tile updated successfully');
};

export const updateFoodProcessingPlatformTileStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFoodProcessingPlatformTileStatus(req.body);
  const tile = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    tile,
    status === 'ACTIVE' ? 'Food Processing platform tile activated' : 'Food Processing platform tile deactivated',
  );
};

export const reorderFoodProcessingPlatformTilesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderFoodProcessingPlatformTiles(req.body);
  const tiles = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, tiles, 'Food Processing platform tiles reordered successfully');
};

export const deleteFoodProcessingPlatformTileController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicFoodProcessingPlatformSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Food Processing platform section retrieved successfully');
};
