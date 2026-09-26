// src/modules/industry-pages/spices-agro-page/controllers/trust-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/trust-section.service';
import {
  validateCreateSpicesAgroTrustLogo,
  validateSpicesAgroTrustLogoListQuery,
  validateSpicesAgroTrustLogoReorder,
  validateSpicesAgroTrustStatusBody,
  validateUpdateSpicesAgroTrustLogo,
  validateUpsertSpicesAgroTrustPanel,
} from '../validators/trust-section.validator';

/**
 * The Spices & Agro Processing page's trust section: the logo marquee and the
 * product panel under it.
 *
 * Two groups of endpoints under one section, because the page renders them as
 * one band but an editor changes them independently.
 */

// The logo marquee.

export const getAllSpicesAgroTrustLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSpicesAgroTrustLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Logos retrieved successfully');
};

export const getSpicesAgroTrustLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Logo retrieved successfully');
};

export const createSpicesAgroTrustLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateSpicesAgroTrustLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Logo created successfully');
};

export const updateSpicesAgroTrustLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSpicesAgroTrustLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Logo updated successfully');
};

export const updateSpicesAgroTrustLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSpicesAgroTrustStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated',
  );
};

export const reorderSpicesAgroTrustLogosController = async (req: Request, res: Response) => {
  const { ids } = validateSpicesAgroTrustLogoReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Logos reordered successfully');
};

export const deleteSpicesAgroTrustLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The product panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getSpicesAgroTrustPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Trust panel retrieved successfully');
};

export const updateSpicesAgroTrustPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertSpicesAgroTrustPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Trust panel saved successfully');
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicSpicesAgroTrustSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Trust section retrieved successfully');
};
