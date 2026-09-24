// src/modules/product-pages/fms-page/controllers/proof-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { FMS_ICON_NAMES } from '../utils/icons';
import * as service from '../services/proof-section.service';
import {
  validateCreateFmsProofLogo,
  validateCreateFmsProofStat,
  validateFmsProofLogoListQuery,
  validateFmsProofLogoReorder,
  validateFmsProofStatListQuery,
  validateFmsProofStatReorder,
  validateFmsProofStatusBody,
  validateUpdateFmsProofLogo,
  validateUpdateFmsProofStat,
} from '../validators/proof-section.validator';

/**
 * The FMS page's proof strip: the brand wall and the numbers beside it.
 *
 * Two groups of endpoints under one section, because the page renders them as
 * one band but an editor changes them independently.
 */

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getFmsIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, FMS_ICON_NAMES, 'Icons retrieved successfully');

// The brand wall.

export const getAllFmsProofLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmsProofLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Logos retrieved successfully');
};

export const getFmsProofLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Logo retrieved successfully');
};

export const createFmsProofLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsProofLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Logo created successfully');
};

export const updateFmsProofLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsProofLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Logo updated successfully');
};

export const updateFmsProofLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsProofStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated',
  );
};

export const reorderFmsProofLogosController = async (req: Request, res: Response) => {
  const { ids } = validateFmsProofLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Logos reordered successfully');
};

export const deleteFmsProofLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The numbers.

export const getAllFmsProofStatsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmsProofStatListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listStats(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Statistics retrieved successfully');
};

export const getFmsProofStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Statistic retrieved successfully');
};

export const createFmsProofStatController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsProofStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Statistic created successfully');
};

export const updateFmsProofStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsProofStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Statistic updated successfully');
};

export const updateFmsProofStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsProofStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Statistic activated' : 'Statistic deactivated',
  );
};

export const reorderFmsProofStatsController = async (req: Request, res: Response) => {
  const { ids } = validateFmsProofStatReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Statistics reordered successfully');
};

export const deleteFmsProofStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicFmsProofSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Proof strip retrieved successfully');
};
