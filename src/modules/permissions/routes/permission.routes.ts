// src/modules/permissions/routes/permission.routes.ts

import { Router } from 'express';
import {
  listGroupedPermissionsController,
  listPermissionsController,
} from '../controllers/permission.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

// Read-only by design. Permissions are seeded from config/constants.ts, so a
// key checked in code always exists and a key in the catalogue is always live.
router.get(
  '/',
  requirePermission(PERMISSIONS.PERMISSIONS_READ),
  asyncHandler(listPermissionsController),
);

router.get(
  '/grouped',
  requirePermission(PERMISSIONS.PERMISSIONS_READ),
  asyncHandler(listGroupedPermissionsController),
);

export default router;
