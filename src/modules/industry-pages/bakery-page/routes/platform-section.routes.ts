// src/modules/industry-pages/bakery-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBakeryPlatformTileController,
  deleteBakeryPlatformTileController,
  getAllBakeryPlatformTilesController,
  getBakeryPlatformTileByIdController,
  getPublicBakeryPlatformSectionController,
  reorderBakeryPlatformTilesController,
  updateBakeryPlatformTileController,
  updateBakeryPlatformTileStatusController,
} from '../controllers/platform-section.controller';

/**
 * Admin router for the connected-platform tiles. The copy beside them is served
 * by the shared section-copy router under ('bakery', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllBakeryPlatformTilesController));
router.post('/', create, asyncHandler(createBakeryPlatformTileController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderBakeryPlatformTilesController));
router.get('/:id', read, asyncHandler(getBakeryPlatformTileByIdController));
router.put('/:id', update, asyncHandler(updateBakeryPlatformTileController));
router.put('/:id/status', update, asyncHandler(updateBakeryPlatformTileStatusController));
router.delete('/:id', destroy, asyncHandler(deleteBakeryPlatformTileController));

export default router;

/** The website-facing read: the copy and its tiles, in one response. */
export const publicBakeryPlatformSectionRouter = Router();

publicBakeryPlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBakeryPlatformSectionController),
);
