// src/modules/product-pages/wms-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { WMS_ICON_NAMES } from '../utils/icons';
import * as service from '../services/cta-section.service';
import {
  validateCreateWmsCtaTrustItem,
  validateWmsCtaStatusBody,
  validateWmsCtaTrustItemListQuery,
  validateWmsCtaTrustItemReorder,
  validateUpdateWmsCtaTrustItem,
  validateUpsertWmsCtaSection,
} from '../validators/cta-section.validator';

/**
 * The WMS page's closing band: the banner and its buttons, and the
 * reassurances under them.
 *
 * Two groups of endpoints under one section, because the page renders them as
 * one band but an editor changes them independently.
 */

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getWmsIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, WMS_ICON_NAMES, 'Icons retrieved successfully');

// The band.

export const getWmsCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Closing band retrieved successfully');
};

export const saveWmsCtaSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertWmsCtaSection(req.body);
  const section = await service.saveSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Closing band saved successfully');
};

// The trust strip.

export const getAllWmsCtaTrustItemsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWmsCtaTrustItemListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listTrustItems(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Trust items retrieved successfully');
};

export const getWmsCtaTrustItemByIdController = async (req: Request, res: Response) => {
  const item = await service.getTrustItemById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, item, 'Trust item retrieved successfully');
};

export const createWmsCtaTrustItemController = async (req: Request, res: Response) => {
  const dto = validateCreateWmsCtaTrustItem(req.body);
  const item = await service.createTrustItem(dto, buildContext(req));
  return ApiResponse.created(res, item, 'Trust item created successfully');
};

export const updateWmsCtaTrustItemController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWmsCtaTrustItem(req.body);
  const item = await service.updateTrustItem(id, dto, buildContext(req));
  return ApiResponse.success(res, item, 'Trust item updated successfully');
};

export const updateWmsCtaTrustItemStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWmsCtaStatusBody(req.body);
  const item = await service.setTrustItemStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    item,
    status === 'ACTIVE' ? 'Trust item activated' : 'Trust item deactivated',
  );
};

export const reorderWmsCtaTrustItemsController = async (req: Request, res: Response) => {
  const { ids } = validateWmsCtaTrustItemReorder(req.body);
  const items = await service.reorderTrustItems(ids, buildContext(req));
  return ApiResponse.success(res, items, 'Trust items reordered successfully');
};

export const deleteWmsCtaTrustItemController = async (req: Request, res: Response) => {
  await service.removeTrustItem(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicWmsCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Closing band retrieved successfully');
};
