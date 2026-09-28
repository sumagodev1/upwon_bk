// src/modules/industry-pages/fmcg-page/controllers/platform-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/platform-section.service';
import {
  validateFmcgPlatformTileListQuery,
  validateFmcgPlatformTileStatus,
  validateCreateFmcgPlatformTile,
  validateReorderFmcgPlatformTiles,
  validateUpdateFmcgPlatformTile,
} from '../validators/platform-section.validator';

/** The FMCG Distribution page's connected-platform tiles. */

export const getAllFmcgPlatformTilesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmcgPlatformTileListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'FMCG platform tiles retrieved successfully');
};

export const getFmcgPlatformTileByIdController = async (req: Request, res: Response) => {
  const tile = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tile, 'FMCG platform tile retrieved successfully');
};

export const createFmcgPlatformTileController = async (req: Request, res: Response) => {
  const dto = validateCreateFmcgPlatformTile(req.body);
  const tile = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, tile, 'FMCG platform tile created successfully');
};

export const updateFmcgPlatformTileController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmcgPlatformTile(req.body);
  const tile = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, tile, 'FMCG platform tile updated successfully');
};

export const updateFmcgPlatformTileStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmcgPlatformTileStatus(req.body);
  const tile = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    tile,
    status === 'ACTIVE' ? 'FMCG platform tile activated' : 'FMCG platform tile deactivated',
  );
};

export const reorderFmcgPlatformTilesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderFmcgPlatformTiles(req.body);
  const tiles = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, tiles, 'FMCG platform tiles reordered successfully');
};

export const deleteFmcgPlatformTileController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicFmcgPlatformSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'FMCG platform section retrieved successfully');
};
