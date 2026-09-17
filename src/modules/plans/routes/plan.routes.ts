// src/modules/plans/routes/plan.routes.ts

import { Router } from 'express';
import {
  archivePlanController,
  createPlanController,
  getAllPlansController,
  getPlanByIdController,
  updatePlanController,
} from '../controllers/plan.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PLANS_READ), asyncHandler(getAllPlansController));

router.post(
  '/',
  requirePermission(PERMISSIONS.PLANS_CREATE),
  asyncHandler(createPlanController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.PLANS_READ),
  asyncHandler(getPlanByIdController),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.PLANS_UPDATE),
  asyncHandler(updatePlanController),
);

// DELETE archives. Plans are never hard-deleted - historical subscriptions
// must still resolve their plan.
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PLANS_DELETE),
  asyncHandler(archivePlanController),
);

export default router;
