// src/modules/industry-pages/dairy-page/controllers/capabilities-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/capabilities-section.service';
import { DAIRY_ICON_NAMES } from '../utils/icons';
import {
  validateDairyCapabilityCardListQuery,
  validateDairyCapabilityCardStatus,
  validateCreateDairyCapabilityCard,
  validateReorderDairyCapabilityCards,
  validateUpsertDairyCapabilitiesPanel,
  validateUpdateDairyCapabilityCard,
} from '../validators/capabilities-section.validator';

/** The Dairy & Ice Cream page's core capabilities. */

/**
 * The icons an item may use. Served so the picker offers exactly what the
 * validator accepts.
 */
export const getDairyCapabilitiesIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, DAIRY_ICON_NAMES, 'Available icons retrieved successfully');

export const getAllDairyCapabilityCardsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateDairyCapabilityCardListQuery(req.query as Record<string, unknown>);
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Dairy & Ice Cream capability cards retrieved successfully');
};

export const getDairyCapabilityCardByIdController = async (req: Request, res: Response) => {
  const item = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, item, 'Dairy & Ice Cream capability card retrieved successfully');
};

export const createDairyCapabilityCardController = async (req: Request, res: Response) => {
  const dto = validateCreateDairyCapabilityCard(req.body);
  const item = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, item, 'Dairy & Ice Cream capability card created successfully');
};

export const updateDairyCapabilityCardController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateDairyCapabilityCard(req.body);
  const item = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, item, 'Dairy & Ice Cream capability card updated successfully');
};

export const updateDairyCapabilityCardStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateDairyCapabilityCardStatus(req.body);
  const item = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    item,
    status === 'ACTIVE' ? 'Dairy & Ice Cream capability card activated' : 'Dairy & Ice Cream capability card deactivated',
  );
};

export const reorderDairyCapabilityCardsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderDairyCapabilityCards(req.body);
  const items = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, items, 'Dairy & Ice Cream capability cards reordered successfully');
};

export const deleteDairyCapabilityCardController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the panel image ───────────────────────────────────────────────────────

/** 200 with a null body when never authored - the form treats that as empty. */
export const getDairyCapabilitiesPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Dairy & Ice Cream panel retrieved successfully');
};

export const upsertDairyCapabilitiesPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertDairyCapabilitiesPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Dairy & Ice Cream panel saved successfully');
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site then hides the section.
 */
export const getPublicDairyCapabilitiesSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Dairy & Ice Cream core capabilities retrieved successfully');
};
