// src/modules/roles/routes/role.routes.ts

import { Router } from 'express';
import {
  createRoleController,
  deleteRoleController,
  getAllRolesController,
  getRoleByIdController,
  replaceRolePermissionsController,
  updateRoleController,
} from '../controllers/role.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.ROLES_READ), asyncHandler(getAllRolesController));

router.post(
  '/',
  requirePermission(PERMISSIONS.ROLES_CREATE),
  asyncHandler(createRoleController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.ROLES_READ),
  asyncHandler(getRoleByIdController),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.ROLES_UPDATE),
  asyncHandler(updateRoleController),
);

// PUT: replaces the entire permission set, which is genuinely idempotent.
router.put(
  '/:id/permissions',
  requirePermission(PERMISSIONS.ROLES_UPDATE),
  asyncHandler(replaceRolePermissionsController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ROLES_DELETE),
  asyncHandler(deleteRoleController),
);

export default router;
