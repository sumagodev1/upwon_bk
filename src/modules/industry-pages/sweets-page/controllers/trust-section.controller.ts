// src/modules/industry-pages/sweets-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/trust-section.service';
import { SWEETS_ICON_NAMES } from '../utils/icons';
import {
  validateSweetsTrustLogoListQuery,
  validateSweetsTrustLogoReorder,
  validateSweetsTrustStatListQuery,
  validateSweetsTrustStatReorder,
  validateSweetsTrustStatusBody,
  validateCreateSweetsTrustLogo,
  validateCreateSweetsTrustStat,
  validateUpdateSweetsTrustLogo,
  validateUpdateSweetsTrustStat,
} from '../validators/trust-section.validator';

/** The Sweets & Namkeen page's trust section: the logos and the figures. */

// ── the customer logos ────────────────────────────────────────────────────

export const getAllSweetsTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSweetsTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Sweets trust logos retrieved successfully');
};

export const getSweetsTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Sweets trust logo retrieved successfully');
};

export const createSweetsTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateSweetsTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Sweets trust logo created successfully');
};

export const updateSweetsTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSweetsTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Sweets trust logo updated successfully');
};

export const updateSweetsTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSweetsTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Sweets trust logo activated' : 'Sweets trust logo deactivated',
  );
};

export const reorderSweetsTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateSweetsTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Sweets trust logos reordered successfully');
};

export const deleteSweetsTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the figures ───────────────────────────────────────────────────────────

/**
 * The icons a figure may use. Served so the picker offers exactly what the
 * validator accepts.
 */
export const getSweetsTrustIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, SWEETS_ICON_NAMES, 'Available icons retrieved successfully');

export const getAllSweetsTrustStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSweetsTrustStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Sweets trust figures retrieved successfully');
};

export const getSweetsTrustStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Sweets trust figure retrieved successfully');
};

export const createSweetsTrustStatController = async (req: Request, res: Response) => {
  const dto = validateCreateSweetsTrustStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Sweets trust figure created successfully');
};

export const updateSweetsTrustStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSweetsTrustStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Sweets trust figure updated successfully');
};

export const updateSweetsTrustStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSweetsTrustStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Sweets trust figure activated' : 'Sweets trust figure deactivated',
  );
};

export const reorderSweetsTrustStatsController = async (req: Request, res: Response) => {
  const { ids } = validateSweetsTrustStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Sweets trust figures reordered successfully');
};

export const deleteSweetsTrustStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the website-facing read ───────────────────────────────────────────────

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats it the way it treats an unreachable API, by keeping its copy.
 */
export const getPublicSweetsTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Sweets trust section retrieved successfully');
};
