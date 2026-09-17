// src/modules/notifications/routes/notification.routes.ts

import { Router } from 'express';
import {
  createNotificationController,
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from '../controllers/notification.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
  asyncHandler(listNotificationsController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.NOTIFICATIONS_CREATE),
  asyncHandler(createNotificationController),
);

// Static path before /:id/read so 'read-all' is not parsed as an id.
router.patch(
  '/read-all',
  requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
  asyncHandler(markAllNotificationsReadController),
);

router.patch(
  '/:id/read',
  requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
  asyncHandler(markNotificationReadController),
);

export default router;
