// src/modules/industry-pages/engineering-manufacturing-page/controllers/platform-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/platform-section.service';
import {
  validateCreateEngineeringPlatformWorkflow,
  validateEngineeringPlatformWorkflowListQuery,
  validateEngineeringPlatformWorkflowStatus,
  validateReorderEngineeringPlatformWorkflows,
  validateUpdateEngineeringPlatformWorkflow,
  validateUpsertEngineeringPlatformPanel,
} from '../validators/platform-section.validator';

/**
 * The Engineering & Manufacturing page's connected platform section: the
 * centre panel (one record) and the workflows (a list).
 */

// The centre panel.

/**
 * Returns 200 with a null body when the panel has never been authored, rather
 * than a 404 - that is a normal first-run answer.
 */
export const getEngineeringPlatformPanelController = async (_req: Request, res: Response) => {
  const panel = await service.getPanel();
  return ApiResponse.success(res, panel, 'Platform panel retrieved successfully');
};

export const updateEngineeringPlatformPanelController = async (req: Request, res: Response) => {
  const dto = validateUpsertEngineeringPlatformPanel(req.body);
  const panel = await service.upsertPanel(dto, buildContext(req));
  return ApiResponse.success(res, panel, 'Platform panel saved successfully');
};

// The workflows.

export const getAllEngineeringPlatformWorkflowsController = async (
  req: Request,
  res: Response,
) => {
  const { filters, pagination } = validateEngineeringPlatformWorkflowListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listWorkflows(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Workflows retrieved successfully');
};

export const getEngineeringPlatformWorkflowByIdController = async (
  req: Request,
  res: Response,
) => {
  const workflow = await service.getWorkflowById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, workflow, 'Workflow retrieved successfully');
};

export const createEngineeringPlatformWorkflowController = async (
  req: Request,
  res: Response,
) => {
  const dto = validateCreateEngineeringPlatformWorkflow(req.body);
  const workflow = await service.createWorkflow(dto, buildContext(req));
  return ApiResponse.created(res, workflow, 'Workflow created successfully');
};

export const updateEngineeringPlatformWorkflowController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateEngineeringPlatformWorkflow(req.body);
  const workflow = await service.updateWorkflow(id, dto, buildContext(req));
  return ApiResponse.success(res, workflow, 'Workflow updated successfully');
};

export const updateEngineeringPlatformWorkflowStatusController = async (
  req: Request,
  res: Response,
) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateEngineeringPlatformWorkflowStatus(req.body);
  const workflow = await service.setWorkflowStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    workflow,
    status === 'ACTIVE' ? 'Workflow activated' : 'Workflow deactivated',
  );
};

export const reorderEngineeringPlatformWorkflowsController = async (
  req: Request,
  res: Response,
) => {
  const { ids } = validateReorderEngineeringPlatformWorkflows(req.body);
  const workflows = await service.reorderWorkflows(ids, buildContext(req));
  return ApiResponse.success(res, workflows, 'Workflows reordered successfully');
};

export const deleteEngineeringPlatformWorkflowController = async (
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
export const getPublicEngineeringPlatformSectionController = async (
  _req: Request,
  res: Response,
) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Platform section retrieved successfully');
};
