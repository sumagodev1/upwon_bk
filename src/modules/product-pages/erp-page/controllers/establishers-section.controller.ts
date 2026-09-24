// src/modules/product-pages/erp-page/controllers/establishers-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/establishers-section.service';
import { validateErpStatusBody } from '../validators/recognition-section.validator';
import {
  validateCreateErpEstablisherBadge,
  validateErpEstablisherBadgeListQuery,
  validateErpEstablisherReorder,
  validateUpdateErpEstablisherBadge,
} from '../validators/establishers-section.validator';

/** The ERP page's trust establishers: the compliance badges beside the sphere. */

export const getAllErpEstablisherBadgesController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateErpEstablisherBadgeListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Badges retrieved successfully');
};

export const getErpEstablisherBadgeByIdController = async (req: Request, res: Response) => {
  const badge = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, badge, 'Badge retrieved successfully');
};

export const createErpEstablisherBadgeController = async (req: Request, res: Response) => {
  const dto = validateCreateErpEstablisherBadge(req.body);
  const badge = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, badge, 'Badge created successfully');
};

export const updateErpEstablisherBadgeController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateErpEstablisherBadge(req.body);
  const badge = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, badge, 'Badge updated successfully');
};

export const updateErpEstablisherBadgeStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpStatusBody(req.body);
  const badge = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    badge,
    status === 'ACTIVE' ? 'Badge activated' : 'Badge deactivated',
  );
};

export const reorderErpEstablisherBadgesController = async (req: Request, res: Response) => {
  const { ids } = validateErpEstablisherReorder(req.body);
  const badges = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, badges, 'Badges reordered successfully');
};

export const deleteErpEstablisherBadgeController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the copy, the badges and the sphere's logos.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicErpEstablishersSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Trust establishers retrieved successfully');
};
