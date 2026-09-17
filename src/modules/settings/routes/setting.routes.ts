// src/modules/settings/routes/setting.routes.ts

import { Router } from 'express';
import {
  getAllSettingsController,
  getSettingByKeyController,
  updateSettingsController,
} from '../controllers/setting.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.SETTINGS_READ),
  asyncHandler(getAllSettingsController),
);

// The endpoint gate is settings.update. The setting service additionally
// enforces the per-key rule that only an ADMIN may change an is_sensitive
// setting - middleware cannot see which keys are sensitive.
router.patch(
  '/',
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  asyncHandler(updateSettingsController),
);

router.get(
  '/:key',
  requirePermission(PERMISSIONS.SETTINGS_READ),
  asyncHandler(getSettingByKeyController),
);

export default router;
