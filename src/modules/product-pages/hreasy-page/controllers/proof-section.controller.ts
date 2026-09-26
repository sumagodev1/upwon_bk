// src/modules/product-pages/hreasy-page/controllers/proof-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/proof-section.service';
import {
  HREASY_PROOF_CELL_SHAPES,
  HREASY_PROOF_CELL_WIDTHS,
  HREASY_PROOF_TILE_KINDS,
} from '../types/proof-section.types';
import {
  validateCreateHreasyProofCell,
  validateHreasyProofCellListQuery,
  validateHreasyProofCellReorder,
  validateHreasyProofStatusBody,
  validateHreasyProofTile,
  validateHreasyProofTileListQuery,
  validateUpdateHreasyProofCell,
} from '../validators/proof-section.validator';

/**
 * The HREasy page's proof bento.
 *
 * Two groups of endpoints under one section: the cards are the content, and
 * the columns are the arrangement they are laid out in.
 */

/**
 * The vocabulary the forms are built from - the three card kinds, the four
 * column widths and the three shapes.
 *
 * Served rather than duplicated in the admin, so a new width is added in one
 * place and the picker picks it up.
 */
export const getHreasyProofOptionsController = async (_req: Request, res: Response) =>
  ApiResponse.success(
    res,
    {
      kinds: HREASY_PROOF_TILE_KINDS,
      widths: HREASY_PROOF_CELL_WIDTHS,
      shapes: HREASY_PROOF_CELL_SHAPES,
    },
    'Options retrieved successfully',
  );

// The cards.

export const getAllHreasyProofTilesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateHreasyProofTileListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listTiles(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Cards retrieved successfully');
};

export const getHreasyProofTileByIdController = async (req: Request, res: Response) => {
  const tile = await service.getTileById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tile, 'Card retrieved successfully');
};

export const createHreasyProofTileController = async (req: Request, res: Response) => {
  const dto = validateHreasyProofTile(req.body);
  const tile = await service.createTile(dto, buildContext(req));
  return ApiResponse.created(res, tile, 'Card created successfully');
};

export const updateHreasyProofTileController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  // A whole replacement, not a patch: switching a logo to a figure has to
  // clear the picture, so every field is written every time.
  const dto = validateHreasyProofTile(req.body);
  const tile = await service.updateTile(id, dto, buildContext(req));
  return ApiResponse.success(res, tile, 'Card updated successfully');
};

export const updateHreasyProofTileStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyProofStatusBody(req.body);
  const tile = await service.setTileStatus(id, status, buildContext(req));
  return ApiResponse.success(res, tile, status === 'ACTIVE' ? 'Card activated' : 'Card deactivated');
};

export const deleteHreasyProofTileController = async (req: Request, res: Response) => {
  await service.removeTile(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The columns.

export const getAllHreasyProofCellsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateHreasyProofCellListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listCells(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Columns retrieved successfully');
};

export const getHreasyProofCellByIdController = async (req: Request, res: Response) => {
  const cell = await service.getCellById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, cell, 'Column retrieved successfully');
};

export const createHreasyProofCellController = async (req: Request, res: Response) => {
  const dto = validateCreateHreasyProofCell(req.body);
  const cell = await service.createCell(dto, buildContext(req));
  return ApiResponse.created(res, cell, 'Column created successfully');
};

export const updateHreasyProofCellController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyProofCell(req.body);
  const cell = await service.updateCell(id, dto, buildContext(req));
  return ApiResponse.success(res, cell, 'Column updated successfully');
};

export const updateHreasyProofCellStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyProofStatusBody(req.body);
  const cell = await service.setCellStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    cell,
    status === 'ACTIVE' ? 'Column activated' : 'Column deactivated',
  );
};

export const reorderHreasyProofCellsController = async (req: Request, res: Response) => {
  const { ids } = validateHreasyProofCellReorder(req.body);
  const cells = await service.reorderCells(ids, buildContext(req));
  return ApiResponse.success(res, cells, 'Columns reordered successfully');
};

export const deleteHreasyProofCellController = async (req: Request, res: Response) => {
  await service.removeCell(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicHreasyProofSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Proof bento retrieved successfully');
};
