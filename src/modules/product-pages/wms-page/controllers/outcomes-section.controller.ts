// src/modules/product-pages/wms-page/controllers/outcomes-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/outcomes-section.service';
import {
  validateCreateWmsOutcomeCard,
  validateUpdateWmsOutcomeCard,
  validateWmsOutcomeCardListQuery,
  validateWmsOutcomeCardReorder,
  validateWmsOutcomeStatusBody,
} from '../validators/outcomes-section.validator';

/**
 * The WMS page's customer-outcomes row: the figures and what earns them.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides
 * something belongs in the service.
 *
 * The icon picker is served by the closing band's /cta-section/icons - one
 * allowlist per page, so one endpoint for it rather than a copy under every
 * section that draws an icon.
 *
 * The eyebrow, heading and subtext above the row are not here - they are
 * served by the shared section-copy router under ('wms', 'outcomes').
 */

export const getAllWmsOutcomeCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWmsOutcomeCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'WMS outcome cards retrieved successfully');
};

export const getWmsOutcomeCardByIdController = async (req: Request, res: Response) => {
  const card = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'WMS outcome card retrieved successfully');
};

export const createWmsOutcomeCardController = async (req: Request, res: Response) => {
  const dto = validateCreateWmsOutcomeCard(req.body);
  const card = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, card, 'WMS outcome card created successfully');
};

export const updateWmsOutcomeCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWmsOutcomeCard(req.body);
  const card = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'WMS outcome card updated successfully');
};

export const updateWmsOutcomeCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWmsOutcomeStatusBody(req.body);
  const card = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'WMS outcome card activated' : 'WMS outcome card deactivated',
  );
};

export const reorderWmsOutcomeCardsController = async (req: Request, res: Response) => {
  const { ids } = validateWmsOutcomeCardReorder(req.body);
  const cards = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'WMS outcome cards reordered successfully');
};

export const deleteWmsOutcomeCardController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicWmsOutcomesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'WMS outcomes section retrieved successfully');
};
