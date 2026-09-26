// src/modules/industry-pages/dairy-page/controllers/platform-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/platform-section.service';
import {
  validateDairyPlatformTileListQuery,
  validateDairyPlatformTileStatus,
  validateCreateDairyPlatformTile,
  validateReorderDairyPlatformTiles,
  validateUpdateDairyPlatformTile,
} from '../validators/platform-section.validator';

/** The Dairy & Ice Cream page's connected-platform tiles. */

export const getAllDairyPlatformTilesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateDairyPlatformTileListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Dairy & Ice Cream platform tiles retrieved successfully');
};

export const getDairyPlatformTileByIdController = async (req: Request, res: Response) => {
  const tile = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tile, 'Dairy & Ice Cream platform tile retrieved successfully');
};

export const createDairyPlatformTileController = async (req: Request, res: Response) => {
  const dto = validateCreateDairyPlatformTile(req.body);
  const tile = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, tile, 'Dairy & Ice Cream platform tile created successfully');
};

export const updateDairyPlatformTileController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateDairyPlatformTile(req.body);
  const tile = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, tile, 'Dairy & Ice Cream platform tile updated successfully');
};

export const updateDairyPlatformTileStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateDairyPlatformTileStatus(req.body);
  const tile = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    tile,
    status === 'ACTIVE' ? 'Dairy & Ice Cream platform tile activated' : 'Dairy & Ice Cream platform tile deactivated',
  );
};

export const reorderDairyPlatformTilesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderDairyPlatformTiles(req.body);
  const tiles = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, tiles, 'Dairy & Ice Cream platform tiles reordered successfully');
};

export const deleteDairyPlatformTileController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by leaving the
 * section out.
 */
export const getPublicDairyPlatformSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Dairy & Ice Cream platform section retrieved successfully');
};
