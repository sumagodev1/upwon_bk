// src/modules/about-page/controllers/number-stats.controller.ts

import { Request, Response } from 'express';
import * as numberStatsService from '../services/number-stats.service';
import {
  validateAboutNumberStatListQuery,
  validateAboutNumberStatStatus,
  validateCreateAboutNumberStat,
  validateReorderAboutNumberStats,
  validateUpdateAboutNumberStat,
} from '../validators/number-stats.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllAboutNumberStatsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateAboutNumberStatListQuery(req.query as Record<string, unknown>);
  const stats = await numberStatsService.list(filters);
  return ApiResponse.success(res, stats, 'Stat cards retrieved successfully');
};

export const getAboutNumberStatByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const stat = await numberStatsService.getById(id);
  return ApiResponse.success(res, stat, 'Stat card retrieved successfully');
};

export const createAboutNumberStatController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateAboutNumberStat(req.body);
  const stat = await numberStatsService.create(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Stat card added successfully');
};

export const updateAboutNumberStatController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateAboutNumberStat(req.body);
  const stat = await numberStatsService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Stat card updated successfully');
};

export const updateAboutNumberStatStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateAboutNumberStatStatus(req.body);
  const stat = await numberStatsService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Stat card published' : 'Stat card unpublished',
  );
};

export const reorderAboutNumberStatsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderAboutNumberStats(req.body);
  const stats = await numberStatsService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Stat cards reordered successfully');
};

export const deleteAboutNumberStatController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await numberStatsService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
