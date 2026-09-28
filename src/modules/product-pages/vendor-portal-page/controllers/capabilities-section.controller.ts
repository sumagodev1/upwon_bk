// src/modules/product-pages/vendor-portal-page/controllers/capabilities-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/capabilities-section.service';
import {
  validateCreateVmsCapabilityCard,
  validateUpdateVmsCapabilityCard,
  validateVmsCapabilityCardListQuery,
  validateVmsCapabilityCardReorder,
  validateVmsCapabilityStatusBody,
} from '../validators/capabilities-section.validator';

/**
 * The Vendor Portal page's capability carousel.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides
 * something belongs in the service.
 */

export const getAllVmsCapabilityCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateVmsCapabilityCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Capability cards retrieved successfully');
};

export const getVmsCapabilityCardByIdController = async (req: Request, res: Response) => {
  const card = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'Capability card retrieved successfully');
};

export const createVmsCapabilityCardController = async (req: Request, res: Response) => {
  const dto = validateCreateVmsCapabilityCard(req.body);
  const card = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, card, 'Capability card created successfully');
};

export const updateVmsCapabilityCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateVmsCapabilityCard(req.body);
  const card = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'Capability card updated successfully');
};

export const updateVmsCapabilityCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateVmsCapabilityStatusBody(req.body);
  const card = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'Capability card activated' : 'Capability card deactivated',
  );
};

export const reorderVmsCapabilityCardsController = async (req: Request, res: Response) => {
  const { ids } = validateVmsCapabilityCardReorder(req.body);
  const cards = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'Capability cards reordered successfully');
};

export const deleteVmsCapabilityCardController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicVmsCapabilitiesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Capabilities section retrieved successfully');
};
