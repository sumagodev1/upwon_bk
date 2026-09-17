// src/modules/dashboard/routes/dashboard.routes.ts

import { Router } from 'express';
import {
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
