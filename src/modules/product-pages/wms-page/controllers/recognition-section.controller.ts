// src/modules/product-pages/wms-page/controllers/recognition-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/recognition-section.service';
import {
  validateCreateWmsRecognitionCard,
  validateUpdateWmsRecognitionCard,
  validateWmsRecognitionCardListQuery,
  validateWmsRecognitionCardReorder,
  validateWmsRecognitionStatusBody,
} from '../validators/recognition-section.validator';

/**
 * The WMS page's warehouse-type map: the cards naming each kind of warehouse.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides
 * something belongs in the service.
 *
 * The eyebrow, heading and subtext above the grid are not here - they are
 * served by the shared section-copy router under ('wms', 'recognition').
 */

export const getAllWmsRecognitionCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWmsRecognitionCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'WMS recognition cards retrieved successfully');
};

export const getWmsRecognitionCardByIdController = async (req: Request, res: Response) => {
  const card = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'WMS recognition card retrieved successfully');
};

export const createWmsRecognitionCardController = async (req: Request, res: Response) => {
  const dto = validateCreateWmsRecognitionCard(req.body);
  const card = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, card, 'WMS recognition card created successfully');
};

export const updateWmsRecognitionCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWmsRecognitionCard(req.body);
  const card = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'WMS recognition card updated successfully');
};

export const updateWmsRecognitionCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWmsRecognitionStatusBody(req.body);
  const card = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'WMS recognition card activated' : 'WMS recognition card deactivated',
  );
};

export const reorderWmsRecognitionCardsController = async (req: Request, res: Response) => {
  const { ids } = validateWmsRecognitionCardReorder(req.body);
  const cards = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'WMS recognition cards reordered successfully');
};

export const deleteWmsRecognitionCardController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicWmsRecognitionSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'WMS recognition section retrieved successfully');
};
