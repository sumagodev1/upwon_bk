// src/modules/audit-logs/routes/audit-log.routes.ts

import { Router } from 'express';
import {
  getAuditLogByIdController,
  listAuditActionsController,
  listAuditLogsController,
} from '../controllers/audit-log.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.AUDIT_LOGS_READ),
  asyncHandler(listAuditLogsController),
);

// Static path registered before /:id so 'actions' is not parsed as an id.
router.get(
  '/actions',
  requirePermission(PERMISSIONS.AUDIT_LOGS_READ),
  asyncHandler(listAuditActionsController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.AUDIT_LOGS_READ),
  asyncHandler(getAuditLogByIdController),
);

export default router;
