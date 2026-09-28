// src/modules/product-pages/wms-page/controllers/proof-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as proofService from '../services/proof-section.service';
import {
  validateCreateWmsProofCard,
  validateCreateWmsProofSlide,
  validateUpdateWmsProofCard,
  validateUpdateWmsProofSlide,
  validateWmsProofCardListQuery,
  validateWmsProofReorder,
  validateWmsProofStatusBody,
} from '../validators/proof-section.validator';

/**
 * The WMS page's proof row.
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. Anything that decides something
 * belongs in the service.
 */

// ── the cards ─────────────────────────────────────────────────────────────

export const getAllWmsProofCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWmsProofCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await proofService.listCards(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'WMS proof cards retrieved successfully');
};

export const getWmsProofCardByIdController = async (req: Request, res: Response) => {
  const card = await proofService.getCardById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'WMS proof card retrieved successfully');
};

export const createWmsProofCardController = async (req: Request, res: Response) => {
  const dto = validateCreateWmsProofCard(req.body);
  const card = await proofService.createCard(dto, buildContext(req));
  return ApiResponse.created(res, card, 'WMS proof card created successfully');
};

export const updateWmsProofCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWmsProofCard(req.body);
  const card = await proofService.updateCard(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'WMS proof card updated successfully');
};

export const updateWmsProofCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWmsProofStatusBody(req.body);
  const card = await proofService.setCardStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'WMS proof card activated' : 'WMS proof card deactivated',
  );
};

export const reorderWmsProofCardsController = async (req: Request, res: Response) => {
  const { ids } = validateWmsProofReorder(req.body);
  const cards = await proofService.reorderCards(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'WMS proof cards reordered successfully');
};

export const deleteWmsProofCardController = async (req: Request, res: Response) => {
  await proofService.removeCard(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the slides ────────────────────────────────────────────────────────────

export const getWmsProofSlidesController = async (req: Request, res: Response) => {
  const slides = await proofService.listSlides(validateUuidParam(req.params.id));
  return ApiResponse.success(res, slides, 'WMS proof slides retrieved successfully');
};

export const getWmsProofSlideByIdController = async (req: Request, res: Response) => {
  const slide = await proofService.getSlideById(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.slideId),
  );
  return ApiResponse.success(res, slide, 'WMS proof slide retrieved successfully');
};

export const createWmsProofSlideController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.id);
  const dto = validateCreateWmsProofSlide(req.body);
  const slide = await proofService.createSlide(cardId, dto, buildContext(req));
  return ApiResponse.created(res, slide, 'WMS proof slide created successfully');
};

export const updateWmsProofSlideController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.id);
  const slideId = validateUuidParam(req.params.slideId);
  const dto = validateUpdateWmsProofSlide(req.body);
  const slide = await proofService.updateSlide(cardId, slideId, dto, buildContext(req));
  return ApiResponse.success(res, slide, 'WMS proof slide updated successfully');
};

export const updateWmsProofSlideStatusController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.id);
  const slideId = validateUuidParam(req.params.slideId);
  const { status } = validateWmsProofStatusBody(req.body);
  const slide = await proofService.setSlideStatus(cardId, slideId, status, buildContext(req));
  return ApiResponse.success(
    res,
    slide,
    status === 'ACTIVE' ? 'WMS proof slide activated' : 'WMS proof slide deactivated',
  );
};

export const reorderWmsProofSlidesController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.id);
  const { ids } = validateWmsProofReorder(req.body);
  const slides = await proofService.reorderSlides(cardId, ids, buildContext(req));
  return ApiResponse.success(res, slides, 'WMS proof slides reordered successfully');
};

export const deleteWmsProofSlideController = async (req: Request, res: Response) => {
  await proofService.removeSlide(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.slideId),
    buildContext(req),
  );
  return ApiResponse.noContent(res);
};

/** The website-facing read: the whole row in one response. */
export const getPublicWmsProofSectionController = async (_req: Request, res: Response) => {
  const section = await proofService.getPublished();
  return ApiResponse.success(res, section, 'WMS proof section retrieved successfully');
};
