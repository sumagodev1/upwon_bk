// src/modules/dashboard/routes/dashboard.routes.ts

import { Router } from 'express';
import {
  getCmsDashboardController,
  getDashboardAnalyticsController,
  getDashboardOverviewController,
} from '../controllers/dashboard.controller';
import { PERMISSIONS } from '../../../config/constants';
import {
  requireAnyPermission,
  requirePermission,
} from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

/**
 * What the admin panel's home screen draws.
 *
 * Separate from '/overview': that one answers for a tenanted SaaS product -
 * organizations, subscriptions, MRR - and those tables are empty on a CMS
 * installation, so a panel built on it shows a screen of zeros.
 */
router.get(
  '/cms',
  requirePermission(PERMISSIONS.DASHBOARD_READ),
  asyncHandler(getCmsDashboardController),
);

router.get(
  '/overview',
  requirePermission(PERMISSIONS.DASHBOARD_READ),
  asyncHandler(getDashboardOverviewController),
);

// OR semantics: audit readers get the analytics view too.
router.get(
  '/analytics',
  requireAnyPermission(PERMISSIONS.DASHBOARD_READ, PERMISSIONS.AUDIT_LOGS_READ),
  asyncHandler(getDashboardAnalyticsController),
);

export default router;
