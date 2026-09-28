// src/modules/industry-pages/sweets-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSweetsPlatformTileController,
  deleteSweetsPlatformTileController,
  getAllSweetsPlatformTilesController,
  getSweetsPlatformTileByIdController,
  getPublicSweetsPlatformSectionController,
  reorderSweetsPlatformTilesController,
  updateSweetsPlatformTileController,
  updateSweetsPlatformTileStatusController,
} from '../controllers/platform-section.controller';

/**
 * Admin router for the connected-platform tiles. The copy beside them is served
 * by the shared section-copy router under ('sweets', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllSweetsPlatformTilesController));
router.post('/', create, asyncHandler(createSweetsPlatformTileController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderSweetsPlatformTilesController));
router.get('/:id', read, asyncHandler(getSweetsPlatformTileByIdController));
router.put('/:id', update, asyncHandler(updateSweetsPlatformTileController));
router.put('/:id/status', update, asyncHandler(updateSweetsPlatformTileStatusController));
router.delete('/:id', destroy, asyncHandler(deleteSweetsPlatformTileController));

export default router;

/** The website-facing read: the copy and its tiles, in one response. */
export const publicSweetsPlatformSectionRouter = Router();

publicSweetsPlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSweetsPlatformSectionController),
);
