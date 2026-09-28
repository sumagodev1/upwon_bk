// src/modules/industry-pages/non-food-fmcg-page/routes/coverage-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createNonFoodFmcgCoverageItemController,
  deleteNonFoodFmcgCoverageItemController,
  getAllNonFoodFmcgCoverageItemsController,
  getNonFoodFmcgCoverageIconsController,
  getNonFoodFmcgCoverageItemByIdController,
  getNonFoodFmcgCoveragePanelController,
  getPublicNonFoodFmcgCoverageSectionController,
  reorderNonFoodFmcgCoverageItemsController,
  updateNonFoodFmcgCoverageItemController,
  updateNonFoodFmcgCoverageItemStatusController,
  upsertNonFoodFmcgCoveragePanelController,
} from '../controllers/coverage-section.controller';

/**
 * Admin router for the industry coverage categories. The copy above them is served by the
 * shared section-copy router under ('non-food-fmcg', 'coverage').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getNonFoodFmcgCoverageIconsController));
router.get('/panel', read, asyncHandler(getNonFoodFmcgCoveragePanelController));
router.put('/panel', update, asyncHandler(upsertNonFoodFmcgCoveragePanelController));
router.get('/', read, asyncHandler(getAllNonFoodFmcgCoverageItemsController));
router.post('/', create, asyncHandler(createNonFoodFmcgCoverageItemController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderNonFoodFmcgCoverageItemsController));
router.get('/:id', read, asyncHandler(getNonFoodFmcgCoverageItemByIdController));
router.put('/:id', update, asyncHandler(updateNonFoodFmcgCoverageItemController));
router.put('/:id/status', update, asyncHandler(updateNonFoodFmcgCoverageItemStatusController));
router.delete('/:id', destroy, asyncHandler(deleteNonFoodFmcgCoverageItemController));

export default router;

/** The website-facing read: the copy and its categories, in one response. */
export const publicNonFoodFmcgCoverageSectionRouter = Router();

publicNonFoodFmcgCoverageSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicNonFoodFmcgCoverageSectionController),
);
