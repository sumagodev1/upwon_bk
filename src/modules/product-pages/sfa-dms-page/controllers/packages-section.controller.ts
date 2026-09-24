// src/modules/product-pages/sfa-dms-page/controllers/packages-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { SFA_ICON_NAMES } from '../utils/icons';
import * as service from '../services/packages-section.service';
import {
  validateCreateSfaPackageCard,
  validateCreateSfaPackageFeature,
  validateSfaPackageCardListQuery,
  validateSfaPackageCardReorder,
  validateSfaPackageFeatureListQuery,
  validateSfaPackageFeatureReorder,
  validateSfaPackageStatusBody,
  validateUpdateSfaPackageCard,
  validateUpdateSfaPackageFeature,
} from '../validators/packages-section.validator';

/**
 * The SFA-DMS page's adoption path: the package cards and their tick lists.
 *
 * Features are addressed under their card - /cards/:cardId/features/:id - so
 * the URL carries the ownership the service then checks, rather than an id
 * that would resolve against any card.
 */

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getSfaIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, SFA_ICON_NAMES, 'Icons retrieved successfully');

// ── the cards ─────────────────────────────────────────────────────────────

export const getAllSfaPackageCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSfaPackageCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listCards(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Packages retrieved successfully');
};

export const getSfaPackageCardByIdController = async (req: Request, res: Response) => {
  const card = await service.getCardById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'Package retrieved successfully');
};

export const createSfaPackageCardController = async (req: Request, res: Response) => {
  const dto = validateCreateSfaPackageCard(req.body);
  const card = await service.createCard(dto, buildContext(req));
  return ApiResponse.created(res, card, 'Package created successfully');
};

export const updateSfaPackageCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaPackageCard(req.body);
  const card = await service.updateCard(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'Package updated successfully');
};

export const updateSfaPackageCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaPackageStatusBody(req.body);
  const card = await service.setCardStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'Package activated' : 'Package deactivated',
  );
};

export const reorderSfaPackageCardsController = async (req: Request, res: Response) => {
  const { ids } = validateSfaPackageCardReorder(req.body);
  const cards = await service.reorderCards(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'Packages reordered successfully');
};

export const deleteSfaPackageCardController = async (req: Request, res: Response) => {
  await service.removeCard(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the ticks ─────────────────────────────────────────────────────────────

export const getAllSfaPackageFeaturesController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.cardId);
  const { filters, pagination } = validateSfaPackageFeatureListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listFeatures(cardId, filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Features retrieved successfully');
};

export const getSfaPackageFeatureByIdController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.cardId);
  const feature = await service.getFeatureById(cardId, validateUuidParam(req.params.id));
  return ApiResponse.success(res, feature, 'Feature retrieved successfully');
};

export const createSfaPackageFeatureController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.cardId);
  const dto = validateCreateSfaPackageFeature(req.body);
  const feature = await service.createFeature(cardId, dto, buildContext(req));
  return ApiResponse.created(res, feature, 'Feature created successfully');
};

export const updateSfaPackageFeatureController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.cardId);
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSfaPackageFeature(req.body);
  const feature = await service.updateFeature(cardId, id, dto, buildContext(req));
  return ApiResponse.success(res, feature, 'Feature updated successfully');
};

export const updateSfaPackageFeatureStatusController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.cardId);
  const id = validateUuidParam(req.params.id);
  const { status } = validateSfaPackageStatusBody(req.body);
  const feature = await service.setFeatureStatus(cardId, id, status, buildContext(req));
  return ApiResponse.success(
    res,
    feature,
    status === 'ACTIVE' ? 'Feature activated' : 'Feature deactivated',
  );
};

export const reorderSfaPackageFeaturesController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.cardId);
  const { ids } = validateSfaPackageFeatureReorder(req.body);
  const features = await service.reorderFeatures(cardId, ids, buildContext(req));
  return ApiResponse.success(res, features, 'Features reordered successfully');
};

export const deleteSfaPackageFeatureController = async (req: Request, res: Response) => {
  const cardId = validateUuidParam(req.params.cardId);
  await service.removeFeature(cardId, validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSfaPackagesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Packages section retrieved successfully');
};
