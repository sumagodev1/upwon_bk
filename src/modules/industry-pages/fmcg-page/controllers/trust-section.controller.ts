// src/modules/industry-pages/fmcg-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/trust-section.service';
import {
  validateFmcgTrustLogoListQuery,
  validateFmcgTrustLogoReorder,
  validateFmcgTrustStatListQuery,
  validateFmcgTrustStatReorder,
  validateFmcgTrustStatusBody,
  validateCreateFmcgTrustLogo,
  validateCreateFmcgTrustStat,
  validateUpdateFmcgTrustLogo,
  validateUpdateFmcgTrustStat,
} from '../validators/trust-section.validator';

/** The FMCG Distribution page's trust section: the logos and the figures. */

// ── the customer logos ────────────────────────────────────────────────────

export const getAllFmcgTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmcgTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'FMCG trust logos retrieved successfully');
};

export const getFmcgTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'FMCG trust logo retrieved successfully');
};

export const createFmcgTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateFmcgTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'FMCG trust logo created successfully');
};

export const updateFmcgTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmcgTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'FMCG trust logo updated successfully');
};

export const updateFmcgTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmcgTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'FMCG trust logo activated' : 'FMCG trust logo deactivated',
  );
};

export const reorderFmcgTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateFmcgTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'FMCG trust logos reordered successfully');
};

export const deleteFmcgTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the figures ───────────────────────────────────────────────────────────

export const getAllFmcgTrustStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmcgTrustStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'FMCG trust figures retrieved successfully');
};

export const getFmcgTrustStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'FMCG trust figure retrieved successfully');
};

export const createFmcgTrustStatController = async (req: Request, res: Response) => {
  const dto = validateCreateFmcgTrustStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'FMCG trust figure created successfully');
};

export const updateFmcgTrustStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmcgTrustStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'FMCG trust figure updated successfully');
};

export const updateFmcgTrustStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmcgTrustStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'FMCG trust figure activated' : 'FMCG trust figure deactivated',
  );
};

export const reorderFmcgTrustStatsController = async (req: Request, res: Response) => {
  const { ids } = validateFmcgTrustStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'FMCG trust figures reordered successfully');
};

export const deleteFmcgTrustStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicFmcgTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'FMCG trust section retrieved successfully');
};
