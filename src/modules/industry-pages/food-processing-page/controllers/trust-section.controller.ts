// src/modules/industry-pages/food-processing-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/trust-section.service';
import {
  validateFoodProcessingTrustLogoListQuery,
  validateFoodProcessingTrustLogoReorder,
  validateFoodProcessingTrustStatListQuery,
  validateFoodProcessingTrustStatReorder,
  validateFoodProcessingTrustStatusBody,
  validateCreateFoodProcessingTrustLogo,
  validateCreateFoodProcessingTrustStat,
  validateUpdateFoodProcessingTrustLogo,
  validateUpdateFoodProcessingTrustStat,
  validateUpsertFoodProcessingTrustPanel,
} from '../validators/trust-section.validator';

/** The Food Processing page's trust section: the logos and the figures. */

// ── the customer logos ────────────────────────────────────────────────────

export const getAllFoodProcessingTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFoodProcessingTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Food Processing trust logos retrieved successfully');
};

export const getFoodProcessingTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Food Processing trust logo retrieved successfully');
};

export const createFoodProcessingTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateFoodProcessingTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Food Processing trust logo created successfully');
};

export const updateFoodProcessingTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFoodProcessingTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Food Processing trust logo updated successfully');
};

export const updateFoodProcessingTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFoodProcessingTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Food Processing trust logo activated' : 'Food Processing trust logo deactivated',
  );
};

export const reorderFoodProcessingTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateFoodProcessingTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Food Processing trust logos reordered successfully');
};

export const deleteFoodProcessingTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the figures ───────────────────────────────────────────────────────────

export const getAllFoodProcessingTrustStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFoodProcessingTrustStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Food Processing trust figures retrieved successfully');
};

export const getFoodProcessingTrustStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Food Processing trust figure retrieved successfully');
};

export const createFoodProcessingTrustStatController = async (req: Request, res: Response) => {
  const dto = validateCreateFoodProcessingTrustStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Food Processing trust figure created successfully');
};

export const updateFoodProcessingTrustStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFoodProcessingTrustStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Food Processing trust figure updated successfully');
};

export const updateFoodProcessingTrustStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFoodProcessingTrustStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Food Processing trust figure activated' : 'Food Processing trust figure deactivated',
  );
};

export const reorderFoodProcessingTrustStatsController = async (req: Request, res: Response) => {
  const { ids } = validateFoodProcessingTrustStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Food Processing trust figures reordered successfully');
};

export const deleteFoodProcessingTrustStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the photo panel ───────────────────────────────────────────────────────

/** 200 with a null body when never authored - the form treats that as empty. */
export const getFoodProcessingTrustPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Food Processing trust panel retrieved successfully');
};

export const upsertFoodProcessingTrustPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertFoodProcessingTrustPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Food Processing trust panel saved successfully');
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicFoodProcessingTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Food Processing trust section retrieved successfully');
};
