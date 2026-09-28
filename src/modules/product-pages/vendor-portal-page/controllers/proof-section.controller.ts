// src/modules/product-pages/vendor-portal-page/controllers/proof-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { ValidationError } from '../../../../core/errors/ValidationError';
import * as service from '../services/proof-section.service';
import {
  validateCreateVmsProofTile,
  validateUpdateVmsProofTile,
  validateVmsProofStatusBody,
  validateVmsProofTileListQuery,
  validateVmsProofTileReorder,
} from '../validators/proof-section.validator';

/**
 * The Vendor Portal page's proof strip - the twelve-column bento.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides
 * something belongs in the service.
 *
 * The icon picker is served by the closing band's /cta-section/icons - one
 * allowlist per page, so one endpoint for it.
 */

export const getAllVmsProofTilesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateVmsProofTileListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Proof tiles retrieved successfully');
};

export const getVmsProofTileByIdController = async (req: Request, res: Response) => {
  const tile = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, tile, 'Proof tile retrieved successfully');
};

export const createVmsProofTileController = async (req: Request, res: Response) => {
  const dto = validateCreateVmsProofTile(req.body);
  const tile = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, tile, 'Proof tile created successfully');
};

export const updateVmsProofTileController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);

  /*
   * A tile's kind is fixed once it exists. Silently ignoring one in the body
   * would let an editor believe the change took, so it is refused here -
   * before the validator, which has no field for it to reject.
   */
  if (req.body && typeof req.body === 'object' && 'kind' in req.body) {
    throw new ValidationError('A tile cannot change kind', [
      {
        field: 'kind',
        message:
          'A metric tile cannot become a picture tile. Delete this one and add the other kind instead.',
        code: 'IMMUTABLE_FIELD',
      },
    ]);
  }

  const dto = validateUpdateVmsProofTile(req.body);
  const tile = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, tile, 'Proof tile updated successfully');
};

export const updateVmsProofTileStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateVmsProofStatusBody(req.body);
  const tile = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    tile,
    status === 'ACTIVE' ? 'Proof tile activated' : 'Proof tile deactivated',
  );
};

export const reorderVmsProofTilesController = async (req: Request, res: Response) => {
  const { ids } = validateVmsProofTileReorder(req.body);
  const tiles = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, tiles, 'Proof tiles reordered successfully');
};

export const deleteVmsProofTileController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicVmsProofSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Proof section retrieved successfully');
};
