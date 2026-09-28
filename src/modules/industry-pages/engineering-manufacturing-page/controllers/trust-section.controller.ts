// src/modules/industry-pages/engineering-manufacturing-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { ENGINEERING_ICON_NAMES } from '../utils/icons';
import * as service from '../services/trust-section.service';
import {
  validateCreateEngineeringTrustLogo,
  validateCreateEngineeringTrustCard,
  validateEngineeringTrustLogoListQuery,
  validateEngineeringTrustLogoReorder,
  validateEngineeringTrustCardListQuery,
  validateEngineeringTrustCardReorder,
  validateEngineeringTrustStatusBody,
  validateUpdateEngineeringTrustLogo,
  validateUpdateEngineeringTrustCard,
} from '../validators/trust-section.validator';

/**
 * The Engineering & Manufacturing page's trust section: the figure cards and
 * the logo marquee.
 *
 * Two groups of endpoints under one section, because the page renders them as
 * one band but an editor changes them independently.
 */

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getEngineeringIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, ENGINEERING_ICON_NAMES, 'Icons retrieved successfully');

// The logo marquee.

export const getAllEngineeringTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateEngineeringTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Logos retrieved successfully');
};

export const getEngineeringTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Logo retrieved successfully');
};

export const createEngineeringTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateEngineeringTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Logo created successfully');
};

export const updateEngineeringTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateEngineeringTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Logo updated successfully');
};

export const updateEngineeringTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateEngineeringTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated',
  );
};

export const reorderEngineeringTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateEngineeringTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Logos reordered successfully');
};

export const deleteEngineeringTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The figure cards.

export const getAllEngineeringTrustCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateEngineeringTrustCardListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listCards(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Cards retrieved successfully');
};

export const getEngineeringTrustCardByIdController = async (req: Request, res: Response) => {
  const card = await service.getCardById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, card, 'Card retrieved successfully');
};

export const createEngineeringTrustCardController = async (req: Request, res: Response) => {
  const dto = validateCreateEngineeringTrustCard(req.body);
  const card = await service.createCard(dto, buildContext(req));
  return ApiResponse.created(res, card, 'Card created successfully');
};

export const updateEngineeringTrustCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateEngineeringTrustCard(req.body);
  const card = await service.updateCard(id, dto, buildContext(req));
  return ApiResponse.success(res, card, 'Card updated successfully');
};

export const updateEngineeringTrustCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateEngineeringTrustStatusBody(req.body);
  const card = await service.setCardStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    card,
    status === 'ACTIVE' ? 'Card activated' : 'Card deactivated',
  );
};

export const reorderEngineeringTrustCardsController = async (req: Request, res: Response) => {
  const { ids } = validateEngineeringTrustCardReorder(req.body);
  const cards = await service.reorderCards(ids, buildContext(req));
  return ApiResponse.success(res, cards, 'Cards reordered successfully');
};

export const deleteEngineeringTrustCardController = async (req: Request, res: Response) => {
  await service.removeCard(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicEngineeringTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Trust section retrieved successfully');
};
