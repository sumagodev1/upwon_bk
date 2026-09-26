// src/modules/industry-pages/qsr-franchise-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/trust-section.service';
import { QSR_FRANCHISE_ICON_NAMES } from '../utils/icons';
import {
  validateCreateQsrFranchiseTrustLogo,
  validateCreateQsrFranchiseTrustStat,
  validateQsrFranchiseTrustLogoListQuery,
  validateQsrFranchiseTrustLogoReorder,
  validateQsrFranchiseTrustStatListQuery,
  validateQsrFranchiseTrustStatReorder,
  validateQsrFranchiseTrustStatusBody,
  validateUpdateQsrFranchiseTrustLogo,
  validateUpdateQsrFranchiseTrustStat,
  validateUpsertQsrFranchiseTrustPanel,
} from '../validators/trust-section.validator';

/**
 * The QSR & Franchise F&B page's trust section: the logo marquee, the stat
 * tiles and the two photographs of the mosaic.
 *
 * Three groups of endpoints under one section, because the page renders them
 * as one band but an editor changes them independently.
 */

// The logo marquee.

export const getAllQsrFranchiseTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateQsrFranchiseTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Logos retrieved successfully');
};

export const getQsrFranchiseTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Logo retrieved successfully');
};

export const createQsrFranchiseTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateQsrFranchiseTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Logo created successfully');
};

export const updateQsrFranchiseTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateQsrFranchiseTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Logo updated successfully');
};

export const updateQsrFranchiseTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateQsrFranchiseTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated',
  );
};

export const reorderQsrFranchiseTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateQsrFranchiseTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Logos reordered successfully');
};

export const deleteQsrFranchiseTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The stat tiles.

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getQsrFranchiseIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, QSR_FRANCHISE_ICON_NAMES, 'Icons retrieved successfully');


export const getAllQsrFranchiseTrustStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateQsrFranchiseTrustStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Stats retrieved successfully');
};

export const getQsrFranchiseTrustStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Stat retrieved successfully');
};

export const createQsrFranchiseTrustStatController = async (req: Request, res: Response) => {
  const dto = validateCreateQsrFranchiseTrustStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Stat created successfully');
};

export const updateQsrFranchiseTrustStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateQsrFranchiseTrustStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Stat updated successfully');
};

export const updateQsrFranchiseTrustStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateQsrFranchiseTrustStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Stat activated' : 'Stat deactivated',
  );
};

export const reorderQsrFranchiseTrustStatsController = async (req: Request, res: Response) => {
  const { ids } = validateQsrFranchiseTrustStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Stats reordered successfully');
};

export const deleteQsrFranchiseTrustStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The photographs.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getQsrFranchiseTrustPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Trust photographs retrieved successfully');
};

export const updateQsrFranchiseTrustPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertQsrFranchiseTrustPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Trust photographs saved successfully');
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicQsrFranchiseTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Trust section retrieved successfully');
};
