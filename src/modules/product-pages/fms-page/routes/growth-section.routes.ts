// src/modules/product-pages/fms-page/routes/growth-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmsGrowthFeatureController,
  createFmsGrowthTierController,
  deleteFmsGrowthFeatureController,
  deleteFmsGrowthTierController,
  getAllFmsGrowthTiersController,
  getFmsGrowthFeatureByIdController,
  getFmsGrowthFeaturesController,
  getFmsGrowthSectionController,
  getFmsGrowthTierByIdController,
  getPublicFmsGrowthSectionController,
  reorderFmsGrowthFeaturesController,
  reorderFmsGrowthTiersController,
  saveFmsGrowthSectionController,
  updateFmsGrowthFeatureController,
  updateFmsGrowthFeatureStatusController,
  updateFmsGrowthTierController,
  updateFmsGrowthTierStatusController,
} from '../controllers/growth-section.controller';

/**
 * Admin router for the growth path.
 *
 * The line under the row sits at the root because there is one of it; the
 * cards are a list under '/tiers', and each card's ticks are nested under it,
 * because a tick has no meaning apart from the tier it belongs to.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getFmsGrowthSectionController));
router.put('/', update, asyncHandler(saveFmsGrowthSectionController));

/*
 * 'tiers/reorder' is declared before 'tiers/:id' - Express matches in
 * registration order, so the reverse would parse it as an id and fail UUID
 * validation. The same holds for the ticks' own reorder below.
 */
router.get('/tiers', read, asyncHandler(getAllFmsGrowthTiersController));
router.post('/tiers', create, asyncHandler(createFmsGrowthTierController));
router.put('/tiers/reorder', update, asyncHandler(reorderFmsGrowthTiersController));
router.get('/tiers/:id', read, asyncHandler(getFmsGrowthTierByIdController));
router.put('/tiers/:id', update, asyncHandler(updateFmsGrowthTierController));
router.put('/tiers/:id/status', update, asyncHandler(updateFmsGrowthTierStatusController));
router.delete('/tiers/:id', destroy, asyncHandler(deleteFmsGrowthTierController));

router.get('/tiers/:id/features', read, asyncHandler(getFmsGrowthFeaturesController));
router.post('/tiers/:id/features', create, asyncHandler(createFmsGrowthFeatureController));
router.put(
  '/tiers/:id/features/reorder',
  update,
  asyncHandler(reorderFmsGrowthFeaturesController),
);
router.get(
  '/tiers/:id/features/:featureId',
  read,
  asyncHandler(getFmsGrowthFeatureByIdController),
);
router.put(
  '/tiers/:id/features/:featureId',
  update,
  asyncHandler(updateFmsGrowthFeatureController),
);
router.put(
  '/tiers/:id/features/:featureId/status',
  update,
  asyncHandler(updateFmsGrowthFeatureStatusController),
);
router.delete(
  '/tiers/:id/features/:featureId',
  destroy,
  asyncHandler(deleteFmsGrowthFeatureController),
);

export default router;

/** The website-facing read: the whole section in one response. */
export const publicFmsGrowthSectionRouter = Router();

publicFmsGrowthSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmsGrowthSectionController),
);
