// src/modules/clients-page/controllers/roster-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import * as service from '../services/roster-section.service';
import {
  validateClientsRosterLogoListQuery,
  validateClientsRosterLogoStatus,
  validateCreateClientsRosterLogo,
  validateReorderClientsRosterLogos,
  validateUpdateClientsRosterLogo,
} from '../validators/roster-section.validator';

/** The Clients page's roster logos. */

export const getAllClientsRosterLogosController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateClientsRosterLogoListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Roster logos retrieved successfully');
};

export const getClientsRosterLogoByIdController = async (req: Request, res: Response) => {
  const logo = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, logo, 'Roster logo retrieved successfully');
};

export const createClientsRosterLogoController = async (req: Request, res: Response) => {
  const dto = validateCreateClientsRosterLogo(req.body);
  const logo = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, logo, 'Roster logo created successfully');
};

export const updateClientsRosterLogoController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateClientsRosterLogo(req.body);
  const logo = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, logo, 'Roster logo updated successfully');
};

export const updateClientsRosterLogoStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateClientsRosterLogoStatus(req.body);
  const logo = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    logo,
    status === 'ACTIVE' ? 'Roster logo published' : 'Roster logo unpublished',
  );
};

export const reorderClientsRosterLogosController = async (req: Request, res: Response) => {
  const { ids } = validateReorderClientsRosterLogos(req.body);
  const logos = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, logos, 'Roster logos reordered successfully');
};

export const deleteClientsRosterLogoController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy and every active logo in one response.
 * 200 with a null body when nothing is published - the site then keeps its own.
 */
export const getPublicClientsRosterSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Roster retrieved successfully');
};
