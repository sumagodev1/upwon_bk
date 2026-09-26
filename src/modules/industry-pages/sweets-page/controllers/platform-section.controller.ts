// src/modules/industry-pages/sweets-page/controllers/platform-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/platform-section.service';
import {
  validateSweetsPlatformTileListQuery,
  validateSweetsPlatformTileStatus,
  validateCreateSweetsPlatformTile,
  validateReorderSweetsPlatformTiles,
  validateUpdateSweetsPlatformTile,
} from '../validators/platform-section.validator';

/** The Sweets & Namkeen page's connected-platform tiles. */

export const getAllSweetsPlatformTilesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSweetsPlatformTileListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Sweets platform tiles retrieved successfully');
};

export const getSweetsPlatformTileByIdController = async (req: Request, res: Response) => {
  const tile = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tile, 'Sweets platform tile retrieved successfully');
};

export const createSweetsPlatformTileController = async (req: Request, res: Response) => {
  const dto = validateCreateSweetsPlatformTile(req.body);
  const tile = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, tile, 'Sweets platform tile created successfully');
};

export const updateSweetsPlatformTileController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSweetsPlatformTile(req.body);
  const tile = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, tile, 'Sweets platform tile updated successfully');
};

export const updateSweetsPlatformTileStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSweetsPlatformTileStatus(req.body);
  const tile = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    tile,
    status === 'ACTIVE' ? 'Sweets platform tile activated' : 'Sweets platform tile deactivated',
  );
};

export const reorderSweetsPlatformTilesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderSweetsPlatformTiles(req.body);
  const tiles = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, tiles, 'Sweets platform tiles reordered successfully');
};

export const deleteSweetsPlatformTileController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicSweetsPlatformSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Sweets platform section retrieved successfully');
};
