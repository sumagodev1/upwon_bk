// src/modules/industry-pages/non-food-fmcg-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/trust-section.service';
import {
  validateNonFoodFmcgTrustLogoListQuery,
  validateNonFoodFmcgTrustLogoReorder,
  validateNonFoodFmcgTrustStatListQuery,
  validateNonFoodFmcgTrustStatReorder,
  validateNonFoodFmcgTrustStatusBody,
  validateCreateNonFoodFmcgTrustLogo,
  validateCreateNonFoodFmcgTrustStat,
  validateUpdateNonFoodFmcgTrustLogo,
  validateUpdateNonFoodFmcgTrustStat,
} from '../validators/trust-section.validator';

/** The Non-Food FMCG page's trust section: the logos and the figures. */

// ── the customer logos ────────────────────────────────────────────────────

export const getAllNonFoodFmcgTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateNonFoodFmcgTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Non-Food FMCG trust logos retrieved successfully');
};

export const getNonFoodFmcgTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Non-Food FMCG trust logo retrieved successfully');
};

export const createNonFoodFmcgTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateNonFoodFmcgTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Non-Food FMCG trust logo created successfully');
};

export const updateNonFoodFmcgTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateNonFoodFmcgTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Non-Food FMCG trust logo updated successfully');
};

export const updateNonFoodFmcgTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateNonFoodFmcgTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Non-Food FMCG trust logo activated' : 'Non-Food FMCG trust logo deactivated',
  );
};

export const reorderNonFoodFmcgTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateNonFoodFmcgTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Non-Food FMCG trust logos reordered successfully');
};

export const deleteNonFoodFmcgTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the figures ───────────────────────────────────────────────────────────

export const getAllNonFoodFmcgTrustStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateNonFoodFmcgTrustStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Non-Food FMCG trust figures retrieved successfully');
};

export const getNonFoodFmcgTrustStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Non-Food FMCG trust figure retrieved successfully');
};

export const createNonFoodFmcgTrustStatController = async (req: Request, res: Response) => {
  const dto = validateCreateNonFoodFmcgTrustStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Non-Food FMCG trust figure created successfully');
};

export const updateNonFoodFmcgTrustStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateNonFoodFmcgTrustStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Non-Food FMCG trust figure updated successfully');
};

export const updateNonFoodFmcgTrustStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateNonFoodFmcgTrustStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Non-Food FMCG trust figure activated' : 'Non-Food FMCG trust figure deactivated',
  );
};

export const reorderNonFoodFmcgTrustStatsController = async (req: Request, res: Response) => {
  const { ids } = validateNonFoodFmcgTrustStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Non-Food FMCG trust figures reordered successfully');
};

export const deleteNonFoodFmcgTrustStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicNonFoodFmcgTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Non-Food FMCG trust section retrieved successfully');
};
