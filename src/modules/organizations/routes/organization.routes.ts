// src/modules/organizations/routes/organization.routes.ts

import { Router } from 'express';
import {
  createOrganizationController,
  deleteOrganizationController,
  getAllOrganizationsController,
  getOrganizationByIdController,
  getOrganizationSubscriptionsController,
  updateOrganizationController,
  updateOrganizationStatusController,
} from '../controllers/organization.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.ORGANIZATIONS_READ),
  asyncHandler(getAllOrganizationsController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.ORGANIZATIONS_CREATE),
  asyncHandler(createOrganizationController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.ORGANIZATIONS_READ),
  asyncHandler(getOrganizationByIdController),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.ORGANIZATIONS_UPDATE),
  asyncHandler(updateOrganizationController),
);

// Status changes get their own sub-resource: different business rules, a
// different audit action, and cascade effects on subscriptions.
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.ORGANIZATIONS_UPDATE),
  asyncHandler(updateOrganizationStatusController),
);

router.get(
  '/:id/subscriptions',
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_READ),
  asyncHandler(getOrganizationSubscriptionsController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ORGANIZATIONS_DELETE),
  asyncHandler(deleteOrganizationController),
);

export default router;
