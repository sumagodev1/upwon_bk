// src/modules/industry-pages/food-processing-page/routes/coverage-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFoodProcessingCoverageItemController,
  deleteFoodProcessingCoverageItemController,
  getAllFoodProcessingCoverageItemsController,
  getFoodProcessingCoverageItemByIdController,
  getPublicFoodProcessingCoverageSectionController,
  reorderFoodProcessingCoverageItemsController,
  updateFoodProcessingCoverageItemController,
  updateFoodProcessingCoverageItemStatusController,
} from '../controllers/coverage-section.controller';

/**
 * Admin router for the industry coverage categories. The copy above them is served by the
 * shared section-copy router under ('food-processing', 'coverage').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllFoodProcessingCoverageItemsController));
router.post('/', create, asyncHandler(createFoodProcessingCoverageItemController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderFoodProcessingCoverageItemsController));
router.get('/:id', read, asyncHandler(getFoodProcessingCoverageItemByIdController));
router.put('/:id', update, asyncHandler(updateFoodProcessingCoverageItemController));
router.put('/:id/status', update, asyncHandler(updateFoodProcessingCoverageItemStatusController));
router.delete('/:id', destroy, asyncHandler(deleteFoodProcessingCoverageItemController));

export default router;

/** The website-facing read: the copy and its categories, in one response. */
export const publicFoodProcessingCoverageSectionRouter = Router();

publicFoodProcessingCoverageSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFoodProcessingCoverageSectionController),
);
