// src/modules/product-pages/hreasy-page/routes/packages-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createHreasyPackageFeatureController,
  createHreasyPackageTierController,
  deleteHreasyPackageFeatureController,
  deleteHreasyPackageTierController,
  getAllHreasyPackageTiersController,
  getHreasyPackageFeatureByIdController,
  getHreasyPackageFeaturesController,
  getHreasyPackageTierByIdController,
  getPublicHreasyPackagesSectionController,
  reorderHreasyPackageFeaturesController,
  reorderHreasyPackageTiersController,
  updateHreasyPackageFeatureController,
  updateHreasyPackageFeatureStatusController,
  updateHreasyPackageTierController,
  updateHreasyPackageTierStatusController,
} from '../controllers/packages-section.controller';

/**
 * Admin router for the tier row.
 *
 * The cards are a list under '/tiers', and each card's ticks are nested under
 * it, because a tick has no meaning apart from the tier it belongs to - the
 * same layout the POS and FMS growth paths use.
 *
 * The copy that heads the row is not here: it is served by the shared
 * section-copy router under ('hreasy', 'packages').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

/*
 * 'tiers/reorder' is declared before 'tiers/:id' - Express matches in
 * registration order, so the reverse would parse it as an id and fail UUID
 * validation. The same holds for the ticks' own reorder below.
 */
router.get('/tiers', read, asyncHandler(getAllHreasyPackageTiersController));
router.post('/tiers', create, asyncHandler(createHreasyPackageTierController));
router.put('/tiers/reorder', update, asyncHandler(reorderHreasyPackageTiersController));
router.get('/tiers/:id', read, asyncHandler(getHreasyPackageTierByIdController));
router.put('/tiers/:id', update, asyncHandler(updateHreasyPackageTierController));
router.put('/tiers/:id/status', update, asyncHandler(updateHreasyPackageTierStatusController));
router.delete('/tiers/:id', destroy, asyncHandler(deleteHreasyPackageTierController));

router.get('/tiers/:id/features', read, asyncHandler(getHreasyPackageFeaturesController));
router.post('/tiers/:id/features', create, asyncHandler(createHreasyPackageFeatureController));
router.put(
  '/tiers/:id/features/reorder',
  update,
  asyncHandler(reorderHreasyPackageFeaturesController),
);
router.get(
  '/tiers/:id/features/:featureId',
  read,
  asyncHandler(getHreasyPackageFeatureByIdController),
);
router.put(
  '/tiers/:id/features/:featureId',
  update,
  asyncHandler(updateHreasyPackageFeatureController),
);
router.put(
  '/tiers/:id/features/:featureId/status',
  update,
  asyncHandler(updateHreasyPackageFeatureStatusController),
);
router.delete(
  '/tiers/:id/features/:featureId',
  destroy,
  asyncHandler(deleteHreasyPackageFeatureController),
);

export default router;

/** The website-facing read: the whole section in one response. */
export const publicHreasyPackagesSectionRouter = Router();

publicHreasyPackagesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicHreasyPackagesSectionController),
);
