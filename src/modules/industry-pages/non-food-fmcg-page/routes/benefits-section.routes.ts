// src/modules/industry-pages/non-food-fmcg-page/routes/benefits-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createNonFoodFmcgBenefitItemController,
  deleteNonFoodFmcgBenefitItemController,
  getAllNonFoodFmcgBenefitItemsController,
  getNonFoodFmcgBenefitItemByIdController,
  getNonFoodFmcgBenefitsIconsController,
  getPublicNonFoodFmcgBenefitsSectionController,
  reorderNonFoodFmcgBenefitItemsController,
  updateNonFoodFmcgBenefitItemController,
  updateNonFoodFmcgBenefitItemStatusController,
} from '../controllers/benefits-section.controller';

/**
 * Admin router for the benefits. The copy above them is served by the
 * shared section-copy router under ('non-food-fmcg', 'benefits').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getNonFoodFmcgBenefitsIconsController));
router.get('/', read, asyncHandler(getAllNonFoodFmcgBenefitItemsController));
router.post('/', create, asyncHandler(createNonFoodFmcgBenefitItemController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderNonFoodFmcgBenefitItemsController));
router.get('/:id', read, asyncHandler(getNonFoodFmcgBenefitItemByIdController));
router.put('/:id', update, asyncHandler(updateNonFoodFmcgBenefitItemController));
router.put('/:id/status', update, asyncHandler(updateNonFoodFmcgBenefitItemStatusController));
router.delete('/:id', destroy, asyncHandler(deleteNonFoodFmcgBenefitItemController));

export default router;

/** The website-facing read: the copy and its benefits, in one response. */
export const publicNonFoodFmcgBenefitsSectionRouter = Router();

publicNonFoodFmcgBenefitsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicNonFoodFmcgBenefitsSectionController),
);
