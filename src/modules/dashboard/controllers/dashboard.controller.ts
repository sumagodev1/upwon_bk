// src/modules/dashboard/controllers/dashboard.controller.ts

import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { validateAnalyticsQuery } from '../validators/dashboard.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';

export const getDashboardOverviewController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const overview = await dashboardService.getOverview();
  return ApiResponse.success(res, overview, 'Dashboard overview retrieved successfully');
};

export const getDashboardAnalyticsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const days = validateAnalyticsQuery(req.query as Record<string, unknown>);
  const analytics = await dashboardService.getAnalytics(days);
  return ApiResponse.success(res, analytics, 'Dashboard analytics retrieved successfully');
};
