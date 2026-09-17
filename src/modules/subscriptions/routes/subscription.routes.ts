// src/modules/subscriptions/routes/subscription.routes.ts

import { Router } from 'express';
import {
  cancelSubscriptionController,
  createSubscriptionController,
  getAllSubscriptionsController,
  getSubscriptionByIdController,
  updateSubscriptionController,
} from '../controllers/subscription.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_READ),
  asyncHandler(getAllSubscriptionsController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_UPDATE),
  asyncHandler(createSubscriptionController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_READ),
  asyncHandler(getSubscriptionByIdController),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_UPDATE),
  asyncHandler(updateSubscriptionController),
);

router.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_UPDATE),
  asyncHandler(cancelSubscriptionController),
);

export default router;
