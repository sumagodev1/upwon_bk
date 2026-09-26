// src/modules/industry-pages/bakery-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/trust-section.service';
import {
  validateBakeryTrustLogoListQuery,
  validateBakeryTrustLogoReorder,
  validateBakeryTrustStatListQuery,
  validateBakeryTrustStatReorder,
  validateBakeryTrustStatusBody,
  validateCreateBakeryTrustLogo,
  validateCreateBakeryTrustStat,
  validateUpdateBakeryTrustLogo,
  validateUpdateBakeryTrustStat,
} from '../validators/trust-section.validator';

/** The Bakery & Confectionery page's trust section: the logos and the figures. */

// ── the customer logos ────────────────────────────────────────────────────

export const getAllBakeryTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBakeryTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Bakery trust logos retrieved successfully');
};

export const getBakeryTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Bakery trust logo retrieved successfully');
};

export const createBakeryTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateBakeryTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Bakery trust logo created successfully');
};

export const updateBakeryTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBakeryTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Bakery trust logo updated successfully');
};

export const updateBakeryTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBakeryTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Bakery trust logo activated' : 'Bakery trust logo deactivated',
  );
};

export const reorderBakeryTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateBakeryTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Bakery trust logos reordered successfully');
};

export const deleteBakeryTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the figures ───────────────────────────────────────────────────────────

export const getAllBakeryTrustStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBakeryTrustStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Bakery trust figures retrieved successfully');
};

export const getBakeryTrustStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Bakery trust figure retrieved successfully');
};

export const createBakeryTrustStatController = async (req: Request, res: Response) => {
  const dto = validateCreateBakeryTrustStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Bakery trust figure created successfully');
};

export const updateBakeryTrustStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBakeryTrustStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Bakery trust figure updated successfully');
};

export const updateBakeryTrustStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBakeryTrustStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Bakery trust figure activated' : 'Bakery trust figure deactivated',
  );
};

export const reorderBakeryTrustStatsController = async (req: Request, res: Response) => {
  const { ids } = validateBakeryTrustStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Bakery trust figures reordered successfully');
};

export const deleteBakeryTrustStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicBakeryTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Bakery trust section retrieved successfully');
};
