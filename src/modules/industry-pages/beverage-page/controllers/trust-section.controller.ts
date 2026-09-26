// src/modules/industry-pages/beverage-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/trust-section.service';
import {
  validateCreateBeverageTrustLogo,
  validateCreateBeverageTrustStat,
  validateBeverageTrustLogoListQuery,
  validateBeverageTrustLogoReorder,
  validateBeverageTrustStatListQuery,
  validateBeverageTrustStatReorder,
  validateBeverageTrustStatusBody,
  validateUpdateBeverageTrustLogo,
  validateUpdateBeverageTrustStat,
} from '../validators/trust-section.validator';

/**
 * The Beverages & Juices page's trust section: the logo marquee and the
 * turning stat card.
 *
 * Two groups of endpoints under one section, because the page renders them as
 * one band but an editor changes them independently.
 */

// The logo marquee.

export const getAllBeverageTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBeverageTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Logos retrieved successfully');
};

export const getBeverageTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Logo retrieved successfully');
};

export const createBeverageTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateBeverageTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Logo created successfully');
};

export const updateBeverageTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBeverageTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Logo updated successfully');
};

export const updateBeverageTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBeverageTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated',
  );
};

export const reorderBeverageTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateBeverageTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Logos reordered successfully');
};

export const deleteBeverageTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The stats.

export const getAllBeverageTrustStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBeverageTrustStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Stats retrieved successfully');
};

export const getBeverageTrustStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Stat retrieved successfully');
};

export const createBeverageTrustStatController = async (req: Request, res: Response) => {
  const dto = validateCreateBeverageTrustStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Stat created successfully');
};

export const updateBeverageTrustStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBeverageTrustStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Stat updated successfully');
};

export const updateBeverageTrustStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBeverageTrustStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Stat activated' : 'Stat deactivated',
  );
};

export const reorderBeverageTrustStatsController = async (req: Request, res: Response) => {
  const { ids } = validateBeverageTrustStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Stats reordered successfully');
};

export const deleteBeverageTrustStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicBeverageTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Trust section retrieved successfully');
};
