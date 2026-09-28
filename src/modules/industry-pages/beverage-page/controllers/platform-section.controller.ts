// src/modules/industry-pages/beverage-page/controllers/platform-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import { BEVERAGE_ICON_NAMES } from '../utils/icons';
import * as service from '../services/platform-section.service';
import {
  validateCreateBeveragePlatformWorkflow,
  validateBeveragePlatformWorkflowListQuery,
  validateBeveragePlatformWorkflowStatus,
  validateReorderBeveragePlatformWorkflows,
  validateUpdateBeveragePlatformWorkflow,
  validateUpsertBeveragePlatformPanel,
} from '../validators/platform-section.validator';

/**
 * The Beverages & Juices page's connected platform section: the panel (one
 * record) and the workflows (a list). The icon names the picker offers are
 * served here too - this page has no other icon section yet.
 */

/** The icon names the picker offers, which are exactly what the validator accepts. */
export const getBeverageIconsController = async (_req: Request, res: Response) =>
  ApiResponse.success(res, BEVERAGE_ICON_NAMES, 'Icons retrieved successfully');

// The panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getBeveragePlatformPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Platform panel retrieved successfully');
};

export const updateBeveragePlatformPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertBeveragePlatformPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Platform panel saved successfully');
};

// The workflows.

export const getAllBeveragePlatformWorkflowsController = async (
  req: Request,
  res: Response,
) => {
  const { filters, pagination } = validateBeveragePlatformWorkflowListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listWorkflows(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Workflows retrieved successfully');
};

export const getBeveragePlatformWorkflowByIdController = async (
  req: Request,
  res: Response,
) => {
  const workflow = await service.getWorkflowById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, workflow, 'Workflow retrieved successfully');
};

export const createBeveragePlatformWorkflowController = async (
  req: Request,
  res: Response,
) => {
  const dto = validateCreateBeveragePlatformWorkflow(req.body);
  const workflow = await service.createWorkflow(dto, buildContext(req));
  return ApiResponse.created(res, workflow, 'Workflow created successfully');
};

export const updateBeveragePlatformWorkflowController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBeveragePlatformWorkflow(req.body);
  const workflow = await service.updateWorkflow(id, dto, buildContext(req));
  return ApiResponse.success(res, workflow, 'Workflow updated successfully');
};

export const updateBeveragePlatformWorkflowStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBeveragePlatformWorkflowStatus(req.body);
  const workflow = await service.setWorkflowStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    workflow,
    status === 'ACTIVE' ? 'Workflow activated' : 'Workflow deactivated',
  );
};

export const reorderBeveragePlatformWorkflowsController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateReorderBeveragePlatformWorkflows(req.body);
  const workflows = await service.reorderWorkflows(ids, buildContext(req));
  return ApiResponse.success(res, workflows, 'Workflows reordered successfully');
};

export const deleteBeveragePlatformWorkflowController = async (
  req: Request,
  res: Response,
) => {
  await service.removeWorkflow(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// The website-facing read.

/**
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * the site treats that the way it treats an unreachable API, by keeping its
 * own copy.
 */
export const getPublicBeveragePlatformSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Platform section retrieved successfully');
};
