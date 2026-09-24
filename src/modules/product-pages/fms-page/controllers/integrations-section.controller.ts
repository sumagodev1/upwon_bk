// src/modules/product-pages/fms-page/controllers/integrations-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/integrations-section.service';
import {
  validateCreateFmsIntegrationLogo,
  validateFmsIntegrationLogoListQuery,
  validateFmsIntegrationReorder,
  validateFmsIntegrationStatusBody,
  validateUpdateFmsIntegrationLogo,
  validateUpsertFmsIntegrationSection,
} from '../validators/integrations-section.validator';

/**
 * The FMS page's integration sphere: the mark at its core, and the marks
 * pinned around it.
 */

// -- the centre mark --------------------------------------------------------

/** Null before it has ever been set - a normal first-run state, not a 404. */
export const getFmsIntegrationSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Integration section retrieved successfully');
};

export const saveFmsIntegrationSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertFmsIntegrationSection(req.body);
  const section = await service.saveSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Integration section saved successfully');
};

// -- the orbit logos --------------------------------------------------------

export const getAllFmsIntegrationLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateFmsIntegrationLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listLogos(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Integration logos retrieved successfully');
};

export const getFmsIntegrationLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getLogoById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Integration logo retrieved successfully');
};

export const createFmsIntegrationLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateFmsIntegrationLogo(req.body);
  const logo = await service.createLogo(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Integration logo created successfully');
};

export const updateFmsIntegrationLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateFmsIntegrationLogo(req.body);
  const logo = await service.updateLogo(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Integration logo updated successfully');
};

export const updateFmsIntegrationLogoStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateFmsIntegrationStatusBody(req.body);
  const logo = await service.setLogoStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated',
  );
};

export const reorderFmsIntegrationLogosController = async (req: Request, res: Response) => {
  const { ids } = validateFmsIntegrationReorder(req.body);
  const logos = await service.reorderLogos(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Integration logos reordered successfully');
};

export const deleteFmsIntegrationLogoController = async (req: Request, res: Response) => {
  await service.removeLogo(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the whole section in one response.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicFmsIntegrationsSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Integrations section retrieved successfully');
};
