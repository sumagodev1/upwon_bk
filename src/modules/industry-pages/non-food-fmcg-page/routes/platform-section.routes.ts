// src/modules/industry-pages/non-food-fmcg-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createNonFoodFmcgPlatformTileController,
  deleteNonFoodFmcgPlatformTileController,
  getAllNonFoodFmcgPlatformTilesController,
  getNonFoodFmcgPlatformTileByIdController,
  getPublicNonFoodFmcgPlatformSectionController,
  reorderNonFoodFmcgPlatformTilesController,
  updateNonFoodFmcgPlatformTileController,
  updateNonFoodFmcgPlatformTileStatusController,
} from '../controllers/platform-section.controller';

/**
 * Admin router for the connected-platform tiles. The copy beside them is served
 * by the shared section-copy router under ('non-food-fmcg', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllNonFoodFmcgPlatformTilesController));
router.post('/', create, asyncHandler(createNonFoodFmcgPlatformTileController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderNonFoodFmcgPlatformTilesController));
router.get('/:id', read, asyncHandler(getNonFoodFmcgPlatformTileByIdController));
router.put('/:id', update, asyncHandler(updateNonFoodFmcgPlatformTileController));
router.put('/:id/status', update, asyncHandler(updateNonFoodFmcgPlatformTileStatusController));
router.delete('/:id', destroy, asyncHandler(deleteNonFoodFmcgPlatformTileController));

export default router;

/** The website-facing read: the copy and its tiles, in one response. */
export const publicNonFoodFmcgPlatformSectionRouter = Router();

publicNonFoodFmcgPlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicNonFoodFmcgPlatformSectionController),
);
