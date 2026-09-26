// src/modules/industry-pages/dairy-page/controllers/benefits-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/benefits-section.service';
import { DAIRY_ICON_NAMES } from '../utils/icons';
import {
  validateDairyBenefitItemListQuery,
  validateDairyBenefitItemStatus,
  validateCreateDairyBenefitItem,
  validateReorderDairyBenefitItems,
  validateUpsertDairyBenefitsPanel,
  validateUpdateDairyBenefitItem,
} from '../validators/benefits-section.validator';

/** The Dairy & Ice Cream page's benefits. */

/**
 * The icons an item may use. Served so the picker offers exactly what the
 * validator accepts.
 */
export const getDairyBenefitsIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, DAIRY_ICON_NAMES, 'Available icons retrieved successfully');

export const getAllDairyBenefitItemsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateDairyBenefitItemListQuery(req.query as Record<string, unknown>);
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Dairy & Ice Cream benefits retrieved successfully');
};

export const getDairyBenefitItemByIdController = async (req: Request, res: Response) => {
  const item = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, item, 'Dairy & Ice Cream benefit retrieved successfully');
};

export const createDairyBenefitItemController = async (req: Request, res: Response) => {
  const dto = validateCreateDairyBenefitItem(req.body);
  const item = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, item, 'Dairy & Ice Cream benefit created successfully');
};

export const updateDairyBenefitItemController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateDairyBenefitItem(req.body);
  const item = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, item, 'Dairy & Ice Cream benefit updated successfully');
};

export const updateDairyBenefitItemStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateDairyBenefitItemStatus(req.body);
  const item = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    item,
    status === 'ACTIVE' ? 'Dairy & Ice Cream benefit activated' : 'Dairy & Ice Cream benefit deactivated',
  );
};

export const reorderDairyBenefitItemsController = async (req: Request, res: Response) => {
  const { ids } = validateReorderDairyBenefitItems(req.body);
  const items = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, items, 'Dairy & Ice Cream benefits reordered successfully');
};

export const deleteDairyBenefitItemController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── the panel image ───────────────────────────────────────────────────────

/** 200 with a null body when never authored - the form treats that as empty. */
export const getDairyBenefitsPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Dairy & Ice Cream panel retrieved successfully');
};

export const upsertDairyBenefitsPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertDairyBenefitsPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Dairy & Ice Cream panel saved successfully');
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site then hides the section.
 */
export const getPublicDairyBenefitsSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Dairy & Ice Cream benefits retrieved successfully');
};
