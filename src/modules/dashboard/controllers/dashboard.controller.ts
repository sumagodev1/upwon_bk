// src/modules/dashboard/controllers/dashboard.controller.ts

import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import * as cmsDashboardService from '../services/cms-dashboard.service';
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

/**
 * The dashboard this installation actually uses.
 *
 * `/overview` above counts organizations, subscriptions and MRR, which belong
 * to a tenanted SaaS product; here those tables are empty and stay that way.
 * This one counts what the panel is for: the site's inboxes, its content, and
 * what has been changed lately.
 *
 * The actor comes from the token rather than the query, so "my recent
 * activity" cannot be asked about somebody else.
 */
export const getCmsDashboardController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dashboard = await cmsDashboardService.getCmsDashboard(req.admin!.id);
  return ApiResponse.success(res, dashboard, 'Dashboard retrieved successfully');
};
