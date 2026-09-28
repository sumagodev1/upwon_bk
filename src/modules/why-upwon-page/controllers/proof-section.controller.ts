// src/modules/why-upwon-page/controllers/proof-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';
import { WHY_UPWON_ICON_NAMES } from '../utils/icons';
import * as service from '../services/proof-section.service';
import {
  validateWhyUpwonProofCalloutListQuery,
  validateWhyUpwonProofCalloutStatus,
  validateCreateWhyUpwonProofCallout,
  validateReorderWhyUpwonProofCallouts,
  validateUpdateWhyUpwonProofCallout,
  validateUpsertWhyUpwonProofPanel,
} from '../validators/proof-section.validator';

/**
 * The Why UpWon page's core callouts: the artwork panel
 * (one record) and the callouts (a list).
 *
 * A thin translation between the HTTP envelope and the service: read the
 * request, hand it over, wrap what comes back. The icon names the picker offers
 * are served here too - this is the page's first icon section.
 */

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getWhyUpwonProofIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, WHY_UPWON_ICON_NAMES, 'Icons retrieved successfully');

// The artwork panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getWhyUpwonProofPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Callouts panel retrieved successfully');
};

export const updateWhyUpwonProofPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertWhyUpwonProofPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Callouts panel saved successfully');
};

// The callouts.

export const getAllWhyUpwonProofCalloutsController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateWhyUpwonProofCalloutListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Callouts retrieved successfully');
};

export const getWhyUpwonProofCalloutByIdController = async (req: Request, res: Response) => {
  const callout = await service.getById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, callout, 'Callout retrieved successfully');
};

export const createWhyUpwonProofCalloutController = async (req: Request, res: Response) => {
  const dto = validateCreateWhyUpwonProofCallout(req.body);
  const callout = await service.create(dto, buildContext(req));
  return ApiResponse.created(res, callout, 'Callout created successfully');
};

export const updateWhyUpwonProofCalloutController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateWhyUpwonProofCallout(req.body);
  const callout = await service.update(id, dto, buildContext(req));
  return ApiResponse.success(res, callout, 'Callout updated successfully');
};

export const updateWhyUpwonProofCalloutStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateWhyUpwonProofCalloutStatus(req.body);
  const callout = await service.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    callout,
    status === 'ACTIVE' ? 'Callout activated' : 'Callout deactivated',
  );
};

export const reorderWhyUpwonProofCalloutsController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateReorderWhyUpwonProofCallouts(req.body);
  const callouts = await service.reorder(ids, buildContext(req));
  return ApiResponse.success(res, callouts, 'Callouts reordered successfully');
};

export const deleteWhyUpwonProofCalloutController = async (req: Request, res: Response) => {
  await service.remove(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats that the way it treats an unreachable API, by keeping its
 * own copy.
 */
export const getPublicWhyUpwonProofSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Callouts section retrieved successfully');
};
