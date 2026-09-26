// src/modules/industry-pages/food-processing-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFoodProcessingPlatformTileController,
  deleteFoodProcessingPlatformTileController,
  getAllFoodProcessingPlatformTilesController,
  getFoodProcessingPlatformTileByIdController,
  getPublicFoodProcessingPlatformSectionController,
  reorderFoodProcessingPlatformTilesController,
  updateFoodProcessingPlatformTileController,
  updateFoodProcessingPlatformTileStatusController,
} from '../controllers/platform-section.controller';

/**
 * Admin router for the connected-platform tiles. The copy beside them is served
 * by the shared section-copy router under ('food-processing', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllFoodProcessingPlatformTilesController));
router.post('/', create, asyncHandler(createFoodProcessingPlatformTileController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderFoodProcessingPlatformTilesController));
router.get('/:id', read, asyncHandler(getFoodProcessingPlatformTileByIdController));
router.put('/:id', update, asyncHandler(updateFoodProcessingPlatformTileController));
router.put('/:id/status', update, asyncHandler(updateFoodProcessingPlatformTileStatusController));
router.delete('/:id', destroy, asyncHandler(deleteFoodProcessingPlatformTileController));

export default router;

/** The website-facing read: the copy and its tiles, in one response. */
export const publicFoodProcessingPlatformSectionRouter = Router();

publicFoodProcessingPlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFoodProcessingPlatformSectionController),
);
