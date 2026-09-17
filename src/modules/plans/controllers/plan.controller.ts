// src/modules/plans/controllers/plan.controller.ts

import { Request, Response } from 'express';
import * as planService from '../services/plan.service';
import {
  validateCreatePlan,
  validatePlanListQuery,
  validateUpdatePlan,
} from '../validators/plan.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllPlansController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validatePlanListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await planService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Plans retrieved successfully');
};

export const getPlanByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const plan = await planService.getById(id);
  return ApiResponse.success(res, plan, 'Plan retrieved successfully');
};

export const createPlanController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreatePlan(req.body);
  const plan = await planService.create(dto, buildContext(req));
  return ApiResponse.created(res, plan, 'Plan created successfully');
};

export const updatePlanController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdatePlan(req.body);
  const plan = await planService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, plan, 'Plan updated successfully');
};

// DELETE archives rather than removing - historical subscriptions must still
// resolve their plan.
export const archivePlanController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const plan = await planService.archive(id, buildContext(req));
  return ApiResponse.success(res, plan, 'Plan archived successfully');
};
