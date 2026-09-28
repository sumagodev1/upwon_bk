// src/modules/industry-pages/fmcg-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmcgPlatformTileController,
  deleteFmcgPlatformTileController,
  getAllFmcgPlatformTilesController,
  getFmcgPlatformTileByIdController,
  getPublicFmcgPlatformSectionController,
  reorderFmcgPlatformTilesController,
  updateFmcgPlatformTileController,
  updateFmcgPlatformTileStatusController,
} from '../controllers/platform-section.controller';

/**
 * Admin router for the connected-platform tiles. The copy beside them is served
 * by the shared section-copy router under ('fmcg', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllFmcgPlatformTilesController));
router.post('/', create, asyncHandler(createFmcgPlatformTileController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderFmcgPlatformTilesController));
router.get('/:id', read, asyncHandler(getFmcgPlatformTileByIdController));
router.put('/:id', update, asyncHandler(updateFmcgPlatformTileController));
router.put('/:id/status', update, asyncHandler(updateFmcgPlatformTileStatusController));
router.delete('/:id', destroy, asyncHandler(deleteFmcgPlatformTileController));

export default router;

/** The website-facing read: the copy and its tiles, in one response. */
export const publicFmcgPlatformSectionRouter = Router();

publicFmcgPlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmcgPlatformSectionController),
);
