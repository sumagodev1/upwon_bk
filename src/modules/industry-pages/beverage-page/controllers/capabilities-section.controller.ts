// src/modules/industry-pages/beverage-page/controllers/capabilities-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/capabilities-section.service';
import {
  validateBeverageCapabilityListQuery,
  validateBeverageCapabilityStatus,
  validateCreateBeverageCapability,
  validateReorderBeverageCapabilities,
  validateUpdateBeverageCapability,
  validateUpsertBeverageCapabilitiesPanel,
} from '../validators/capabilities-section.validator';

/**
 * The Beverages & Juices page's core capabilities: the background panel (one
 * record) and the capabilities (a list).
 */

// The background panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getBeverageCapabilitiesPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Capabilities panel retrieved successfully');
};

export const updateBeverageCapabilitiesPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertBeverageCapabilitiesPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Capabilities panel saved successfully');
};

// The capabilities.

export const getAllBeverageCapabilitiesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateBeverageCapabilityListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listCapabilities(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Capabilities retrieved successfully');
};

export const getBeverageCapabilityByIdController = async (req: Request, res: Response) => {
  const capability = await service.getCapabilityById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, capability, 'Capability retrieved successfully');
};

export const createBeverageCapabilityController = async (req: Request, res: Response) => {
  const dto = validateCreateBeverageCapability(req.body);
  const capability = await service.createCapability(dto, buildContext(req));
  return ApiResponse.created(res, capability, 'Capability created successfully');
};

export const updateBeverageCapabilityController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBeverageCapability(req.body);
  const capability = await service.updateCapability(id, dto, buildContext(req));
  return ApiResponse.success(res, capability, 'Capability updated successfully');
};

export const updateBeverageCapabilityStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBeverageCapabilityStatus(req.body);
  const capability = await service.setCapabilityStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    capability,
    status === 'ACTIVE' ? 'Capability activated' : 'Capability deactivated',
  );
};

export const reorderBeverageCapabilitiesController = async (req: Request, res: Response) => {
  const { ids } = validateReorderBeverageCapabilities(req.body);
  const capabilities = await service.reorderCapabilities(ids, buildContext(req));
  return ApiResponse.success(res, capabilities, 'Capabilities reordered successfully');
};

export const deleteBeverageCapabilityController = async (req: Request, res: Response) => {
  await service.removeCapability(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats that the way it treats an unreachable API, by keeping its
 * own copy.
 */
export const getPublicBeverageCapabilitiesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Capabilities section retrieved successfully');
};
