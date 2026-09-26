// src/modules/industry-pages/non-food-fmcg-page/routes/capabilities-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createNonFoodFmcgCapabilityCardController,
  deleteNonFoodFmcgCapabilityCardController,
  getAllNonFoodFmcgCapabilityCardsController,
  getNonFoodFmcgCapabilityCardByIdController,
  getPublicNonFoodFmcgCapabilitiesSectionController,
  reorderNonFoodFmcgCapabilityCardsController,
  updateNonFoodFmcgCapabilityCardController,
  updateNonFoodFmcgCapabilityCardStatusController,
} from '../controllers/capabilities-section.controller';

/**
 * Admin router for the core capabilities. The copy above them is served by the
 * shared section-copy router under ('non-food-fmcg', 'capabilities').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllNonFoodFmcgCapabilityCardsController));
router.post('/', create, asyncHandler(createNonFoodFmcgCapabilityCardController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderNonFoodFmcgCapabilityCardsController));
router.get('/:id', read, asyncHandler(getNonFoodFmcgCapabilityCardByIdController));
router.put('/:id', update, asyncHandler(updateNonFoodFmcgCapabilityCardController));
router.put('/:id/status', update, asyncHandler(updateNonFoodFmcgCapabilityCardStatusController));
router.delete('/:id', destroy, asyncHandler(deleteNonFoodFmcgCapabilityCardController));

export default router;

/** The website-facing read: the copy and its capabilities, in one response. */
export const publicNonFoodFmcgCapabilitiesSectionRouter = Router();

publicNonFoodFmcgCapabilitiesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicNonFoodFmcgCapabilitiesSectionController),
);
