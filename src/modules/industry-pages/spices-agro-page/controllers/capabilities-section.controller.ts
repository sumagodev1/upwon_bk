// src/modules/industry-pages/spices-agro-page/controllers/capabilities-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { SPICES_AGRO_ICON_NAMES } from '../utils/icons';
import * as service from '../services/capabilities-section.service';
import {
  validateSpicesAgroCapabilityListQuery,
  validateSpicesAgroCapabilityStatus,
  validateCreateSpicesAgroCapability,
  validateReorderSpicesAgroCapabilities,
  validateUpdateSpicesAgroCapability,
  validateUpsertSpicesAgroCapabilitiesPanel,
} from '../validators/capabilities-section.validator';

/**
 * The Spices & Agro Processing page's core capabilities: the background panel
 * (one record) and the capabilities (a list).
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. The icon names the picker offers
 * are served here too - this is the page's first icon section.
 */

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getSpicesAgroIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, SPICES_AGRO_ICON_NAMES, 'Icons retrieved successfully');

// The background panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getSpicesAgroCapabilitiesPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Capabilities panel retrieved successfully');
};

export const updateSpicesAgroCapabilitiesPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertSpicesAgroCapabilitiesPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Capabilities panel saved successfully');
};

// The capabilities.

export const getAllSpicesAgroCapabilitiesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateSpicesAgroCapabilityListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Capabilities retrieved successfully');
};

export const getSpicesAgroCapabilityByIdController = async (req: Request, res: Response) => {
  const capability = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, capability, 'Capability retrieved successfully');
};

export const createSpicesAgroCapabilityController = async (req: Request, res: Response) => {
  const dto = validateCreateSpicesAgroCapability(req.body);
  const capability = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, capability, 'Capability created successfully');
};

export const updateSpicesAgroCapabilityController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateSpicesAgroCapability(req.body);
  const capability = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, capability, 'Capability updated successfully');
};

export const updateSpicesAgroCapabilityStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateSpicesAgroCapabilityStatus(req.body);
  const capability = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    capability,
    status === 'ACTIVE' ? 'Capability activated' : 'Capability deactivated',
  );
};

export const reorderSpicesAgroCapabilitiesController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateReorderSpicesAgroCapabilities(req.body);
  const capabilities = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, capabilities, 'Capabilities reordered successfully');
};

export const deleteSpicesAgroCapabilityController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats that the way it treats an unreachable API, by keeping its
 * own copy.
 */
export const getPublicSpicesAgroCapabilitiesSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Capabilities section retrieved successfully');
};
