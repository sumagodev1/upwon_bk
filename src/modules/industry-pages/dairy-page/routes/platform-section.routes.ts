// src/modules/industry-pages/dairy-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createDairyPlatformTileController,
  deleteDairyPlatformTileController,
  getAllDairyPlatformTilesController,
  getDairyPlatformTileByIdController,
  getPublicDairyPlatformSectionController,
  reorderDairyPlatformTilesController,
  updateDairyPlatformTileController,
  updateDairyPlatformTileStatusController,
} from '../controllers/platform-section.controller';

/**
 * Admin router for the connected-platform tiles. The copy beside them is served
 * by the shared section-copy router under ('dairy', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllDairyPlatformTilesController));
router.post('/', create, asyncHandler(createDairyPlatformTileController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderDairyPlatformTilesController));
router.get('/:id', read, asyncHandler(getDairyPlatformTileByIdController));
router.put('/:id', update, asyncHandler(updateDairyPlatformTileController));
router.put('/:id/status', update, asyncHandler(updateDairyPlatformTileStatusController));
router.delete('/:id', destroy, asyncHandler(deleteDairyPlatformTileController));

export default router;

/** The website-facing read: the copy and its tiles, in one response. */
export const publicDairyPlatformSectionRouter = Router();

publicDairyPlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicDairyPlatformSectionController),
);
