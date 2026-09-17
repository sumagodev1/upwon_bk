// src/modules/admins/routes/admin.routes.ts

import { Router } from 'express';
import {
  createAdminController,
  deleteAdminController,
  getAdminByIdController,
  getAllAdminsController,
  replaceAdminRolesController,
  updateAdminController,
  updateAdminStatusController,
} from '../controllers/admin.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

// `authenticate` is applied once in src/routes/index.ts for every module.
// Each route below declares only the permission it needs.

// Get all admins
router.get(
  '/',
  requirePermission(PERMISSIONS.ADMINS_READ),
  asyncHandler(getAllAdminsController),
);

// Create admin
router.post(
  '/create-admin',
  requirePermission(PERMISSIONS.ADMINS_CREATE),
  asyncHandler(createAdminController),
);

// Get admin by id
router.get(
  '/:id',
  requirePermission(PERMISSIONS.ADMINS_READ),
  asyncHandler(getAdminByIdController),
);

// Update admin profile
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.ADMINS_UPDATE),
  asyncHandler(updateAdminController),
);

// Change admin status
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.ADMINS_UPDATE),
  asyncHandler(updateAdminStatusController),
);

// Replace the admin's entire role set.
// PUT, not PATCH: replacing the whole set is genuinely idempotent.
router.put(
  '/:id/roles',
  requirePermission(PERMISSIONS.ADMINS_UPDATE),
  asyncHandler(replaceAdminRolesController),
);

// Soft delete admin
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ADMINS_DELETE),
  asyncHandler(deleteAdminController),
);

export default router;
