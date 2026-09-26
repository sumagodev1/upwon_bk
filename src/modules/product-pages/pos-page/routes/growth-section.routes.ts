// src/modules/product-pages/pos-page/routes/growth-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createPosGrowthFeatureController,
  createPosGrowthTierController,
  deletePosGrowthFeatureController,
  deletePosGrowthTierController,
  getAllPosGrowthTiersController,
  getPosGrowthFeatureByIdController,
  getPosGrowthFeaturesController,
  getPosGrowthSectionController,
  getPosGrowthTierByIdController,
  getPublicPosGrowthSectionController,
  reorderPosGrowthFeaturesController,
  reorderPosGrowthTiersController,
  savePosGrowthSectionController,
  updatePosGrowthFeatureController,
  updatePosGrowthFeatureStatusController,
  updatePosGrowthTierController,
  updatePosGrowthTierStatusController,
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

router.get('/', read, asyncHandler(getPosGrowthSectionController));
router.put('/', update, asyncHandler(savePosGrowthSectionController));

/*
 * 'tiers/reorder' is declared before 'tiers/:id' - Express matches in
 * registration order, so the reverse would parse it as an id and fail UUID
 * validation. The same holds for the ticks' own reorder below.
 */
router.get('/tiers', read, asyncHandler(getAllPosGrowthTiersController));
router.post('/tiers', create, asyncHandler(createPosGrowthTierController));
router.put('/tiers/reorder', update, asyncHandler(reorderPosGrowthTiersController));
router.get('/tiers/:id', read, asyncHandler(getPosGrowthTierByIdController));
router.put('/tiers/:id', update, asyncHandler(updatePosGrowthTierController));
router.put('/tiers/:id/status', update, asyncHandler(updatePosGrowthTierStatusController));
router.delete('/tiers/:id', destroy, asyncHandler(deletePosGrowthTierController));

router.get('/tiers/:id/features', read, asyncHandler(getPosGrowthFeaturesController));
router.post('/tiers/:id/features', create, asyncHandler(createPosGrowthFeatureController));
router.put(
  '/tiers/:id/features/reorder',
  update,
  asyncHandler(reorderPosGrowthFeaturesController),
);
router.get(
  '/tiers/:id/features/:featureId',
  read,
  asyncHandler(getPosGrowthFeatureByIdController),
);
router.put(
  '/tiers/:id/features/:featureId',
  update,
  asyncHandler(updatePosGrowthFeatureController),
);
router.put(
  '/tiers/:id/features/:featureId/status',
  update,
  asyncHandler(updatePosGrowthFeatureStatusController),
);
router.delete(
  '/tiers/:id/features/:featureId',
  destroy,
  asyncHandler(deletePosGrowthFeatureController),
);

export default router;

/** The website-facing read: the whole section in one response. */
export const publicPosGrowthSectionRouter = Router();

publicPosGrowthSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicPosGrowthSectionController),
);
