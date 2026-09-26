// src/modules/industry-pages/bakery-page/controllers/platform-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/platform-section.service';
import {
  validateBakeryPlatformTileListQuery,
  validateBakeryPlatformTileStatus,
  validateCreateBakeryPlatformTile,
  validateReorderBakeryPlatformTiles,
  validateUpdateBakeryPlatformTile,
} from '../validators/platform-section.validator';

/** The Bakery & Confectionery page's connected-platform tiles. */

export const getAllBakeryPlatformTilesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBakeryPlatformTileListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Bakery platform tiles retrieved successfully');
};

export const getBakeryPlatformTileByIdController = async (req: Request, res: Response) => {
  const tile = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tile, 'Bakery platform tile retrieved successfully');
};

export const createBakeryPlatformTileController = async (req: Request, res: Response) => {
  const dto = validateCreateBakeryPlatformTile(req.body);
  const tile = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, tile, 'Bakery platform tile created successfully');
};

export const updateBakeryPlatformTileController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBakeryPlatformTile(req.body);
  const tile = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, tile, 'Bakery platform tile updated successfully');
};

export const updateBakeryPlatformTileStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBakeryPlatformTileStatus(req.body);
  const tile = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    tile,
    status === 'ACTIVE' ? 'Bakery platform tile activated' : 'Bakery platform tile deactivated',
  );
};

export const reorderBakeryPlatformTilesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderBakeryPlatformTiles(req.body);
  const tiles = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, tiles, 'Bakery platform tiles reordered successfully');
};

export const deleteBakeryPlatformTileController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicBakeryPlatformSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Bakery platform section retrieved successfully');
};
