// src/modules/product-pages/hreasy-page/controllers/cta-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { HREASY_ICON_NAMES } from '../utils/icons';
import * as service from '../services/cta-section.service';
import {
  validateCreateHreasyCtaTrustItem,
  validateHreasyCtaStatusBody,
  validateHreasyCtaTrustItemListQuery,
  validateHreasyCtaTrustItemReorder,
  validateUpdateHreasyCtaTrustItem,
  validateUpsertHreasyCtaSection,
} from '../validators/cta-section.validator';

/**
 * The HREasy page's closing band: the banner and its buttons, and the
 * reassurances under them.
 *
 * Two groups of endpoints under one section, because the page renders them as
 * one band but an editor changes them independently.
 */

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getHreasyIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, HREASY_ICON_NAMES, 'Icons retrieved successfully');

// The band.

export const getHreasyCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.getSection();
  return ApiResponse.success(res, section, 'Closing band retrieved successfully');
};

export const saveHreasyCtaSectionController = async (req: Request, res: Response) => {
  const dto = validateUpsertHreasyCtaSection(req.body);
  const section = await service.saveSection(dto, buildContext(req));
  return ApiResponse.success(res, section, 'Closing band saved successfully');
};

// The trust strip.

export const getAllHreasyCtaTrustItemsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateHreasyCtaTrustItemListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listTrustItems(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Trust items retrieved successfully');
};

export const getHreasyCtaTrustItemByIdController = async (req: Request, res: Response) => {
  const item = await service.getTrustItemById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, item, 'Trust item retrieved successfully');
};

export const createHreasyCtaTrustItemController = async (req: Request, res: Response) => {
  const dto = validateCreateHreasyCtaTrustItem(req.body);
  const item = await service.createTrustItem(dto, buildContext(req));
  return ApiResponse.created(res, item, 'Trust item created successfully');
};

export const updateHreasyCtaTrustItemController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateHreasyCtaTrustItem(req.body);
  const item = await service.updateTrustItem(id, dto, buildContext(req));
  return ApiResponse.success(res, item, 'Trust item updated successfully');
};

export const updateHreasyCtaTrustItemStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateHreasyCtaStatusBody(req.body);
  const item = await service.setTrustItemStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    item,
    status === 'ACTIVE' ? 'Trust item activated' : 'Trust item deactivated',
  );
};

export const reorderHreasyCtaTrustItemsController = async (req: Request, res: Response) => {
  const { ids } = validateHreasyCtaTrustItemReorder(req.body);
  const items = await service.reorderTrustItems(ids, buildContext(req));
  return ApiResponse.success(res, items, 'Trust items reordered successfully');
};

export const deleteHreasyCtaTrustItemController = async (req: Request, res: Response) => {
  await service.removeTrustItem(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicHreasyCtaSectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Closing band retrieved successfully');
};
