// src/modules/product-pages/erp-page/controllers/outcomes-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/outcomes-section.service';
import { validateErpStatusBody } from '../validators/recognition-section.validator';
import {
  validateCreateErpOutcomeCard,
  validateErpOutcomeCardListQuery,
  validateErpOutcomeReorder,
  validateUpdateErpOutcomeCard,
} from '../validators/outcomes-section.validator';

/** The ERP page's customer outcomes carousel. */

export const getAllErpOutcomeCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateErpOutcomeCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Outcome cards retrieved successfully');
};

export const getErpOutcomeCardByIdController = async (req: Request, res: Response) => {
  const card = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'Outcome card retrieved successfully');
};

export const createErpOutcomeCardController = async (req: Request, res: Response) => {
  const dto = validateCreateErpOutcomeCard(req.body);
  const card = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, card, 'Outcome card created successfully');
};

export const updateErpOutcomeCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateErpOutcomeCard(req.body);
  const card = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'Outcome card updated successfully');
};

export const updateErpOutcomeCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpStatusBody(req.body);
  const card = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'Outcome card activated' : 'Outcome card deactivated',
  );
};

export const reorderErpOutcomeCardsController = async (req: Request, res: Response) => {
  const { ids } = validateErpOutcomeReorder(req.body);
  const cards = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'Outcome cards reordered successfully');
};

export const deleteErpOutcomeCardController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy and every active card in one response.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicErpOutcomesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Customer outcomes retrieved successfully');
};
