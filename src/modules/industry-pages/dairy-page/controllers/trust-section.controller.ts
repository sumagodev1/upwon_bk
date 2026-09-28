// src/modules/industry-pages/dairy-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/trust-section.service';
import {
  validateDairyTrustLogoListQuery,
  validateDairyTrustLogoReorder,
  validateDairyTrustStatListQuery,
  validateDairyTrustStatReorder,
  validateDairyTrustStatusBody,
  validateCreateDairyTrustLogo,
  validateCreateDairyTrustStat,
  validateUpdateDairyTrustLogo,
  validateUpdateDairyTrustStat,
} from '../validators/trust-section.validator';

/** The Dairy & Ice Cream page's trust section: the logos and the figures. */

// ── the customer logos ────────────────────────────────────────────────────

export const getAllDairyTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateDairyTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Dairy & Ice Cream trust logos retrieved successfully');
};

export const getDairyTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Dairy & Ice Cream trust logo retrieved successfully');
};

export const createDairyTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateDairyTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Dairy & Ice Cream trust logo created successfully');
};

export const updateDairyTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateDairyTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Dairy & Ice Cream trust logo updated successfully');
};

export const updateDairyTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateDairyTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Dairy & Ice Cream trust logo activated' : 'Dairy & Ice Cream trust logo deactivated',
  );
};

export const reorderDairyTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateDairyTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Dairy & Ice Cream trust logos reordered successfully');
};

export const deleteDairyTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the figures ───────────────────────────────────────────────────────────

export const getAllDairyTrustStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateDairyTrustStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Dairy & Ice Cream trust figures retrieved successfully');
};

export const getDairyTrustStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Dairy & Ice Cream trust figure retrieved successfully');
};

export const createDairyTrustStatController = async (req: Request, res: Response) => {
  const dto = validateCreateDairyTrustStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Dairy & Ice Cream trust figure created successfully');
};

export const updateDairyTrustStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateDairyTrustStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Dairy & Ice Cream trust figure updated successfully');
};

export const updateDairyTrustStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateDairyTrustStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Dairy & Ice Cream trust figure activated' : 'Dairy & Ice Cream trust figure deactivated',
  );
};

export const reorderDairyTrustStatsController = async (req: Request, res: Response) => {
  const { ids } = validateDairyTrustStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Dairy & Ice Cream trust figures reordered successfully');
};

export const deleteDairyTrustStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by leaving the
 * section out.
 */
export const getPublicDairyTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Dairy & Ice Cream trust section retrieved successfully');
};
