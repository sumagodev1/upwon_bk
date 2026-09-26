// src/modules/industry-pages/non-food-fmcg-page/controllers/platform-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/platform-section.service';
import {
  validateNonFoodFmcgPlatformTileListQuery,
  validateNonFoodFmcgPlatformTileStatus,
  validateCreateNonFoodFmcgPlatformTile,
  validateReorderNonFoodFmcgPlatformTiles,
  validateUpdateNonFoodFmcgPlatformTile,
} from '../validators/platform-section.validator';

/** The Non-Food FMCG page's connected-platform tiles. */

export const getAllNonFoodFmcgPlatformTilesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateNonFoodFmcgPlatformTileListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Non-Food FMCG platform tiles retrieved successfully');
};

export const getNonFoodFmcgPlatformTileByIdController = async (req: Request, res: Response) => {
  const tile = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tile, 'Non-Food FMCG platform tile retrieved successfully');
};

export const createNonFoodFmcgPlatformTileController = async (req: Request, res: Response) => {
  const dto = validateCreateNonFoodFmcgPlatformTile(req.body);
  const tile = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, tile, 'Non-Food FMCG platform tile created successfully');
};

export const updateNonFoodFmcgPlatformTileController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateNonFoodFmcgPlatformTile(req.body);
  const tile = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, tile, 'Non-Food FMCG platform tile updated successfully');
};

export const updateNonFoodFmcgPlatformTileStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateNonFoodFmcgPlatformTileStatus(req.body);
  const tile = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    tile,
    status === 'ACTIVE' ? 'Non-Food FMCG platform tile activated' : 'Non-Food FMCG platform tile deactivated',
  );
};

export const reorderNonFoodFmcgPlatformTilesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderNonFoodFmcgPlatformTiles(req.body);
  const tiles = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, tiles, 'Non-Food FMCG platform tiles reordered successfully');
};

export const deleteNonFoodFmcgPlatformTileController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicNonFoodFmcgPlatformSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Non-Food FMCG platform section retrieved successfully');
};
