// src/modules/product-pages/erp-page/routes/recognition-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createErpIndustryBenefitController,
  createErpIndustryController,
  createErpIndustryFeatureController,
  deleteErpIndustryBenefitController,
  deleteErpIndustryController,
  deleteErpIndustryFeatureController,
  getAllErpIndustriesController,
  getAllErpIndustryBenefitsController,
  getErpIconsController,
  getErpIndustryBenefitByIdController,
  getErpIndustryByIdController,
  getErpIndustryFeatureByIdController,
  getErpIndustryFeaturesController,
  getPublicErpRecognitionSectionController,
  reorderErpIndustriesController,
  reorderErpIndustryBenefitsController,
  reorderErpIndustryFeaturesController,
  updateErpIndustryBenefitController,
  updateErpIndustryBenefitStatusController,
  updateErpIndustryController,
  updateErpIndustryFeatureController,
  updateErpIndustryFeatureStatusController,
  updateErpIndustryStatusController,
} from '../controllers/recognition-section.controller';

/**
 * Admin router for the industry recognition switcher.
 *
 * Features are nested under their industry because they have no meaning apart
 * from it - the path says whose they are, so no request can orphan one.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/icons', read, asyncHandler(getErpIconsController));

router.get('/benefits', read, asyncHandler(getAllErpIndustryBenefitsController));
router.post('/benefits', create, asyncHandler(createErpIndustryBenefitController));
router.put(
  '/benefits/reorder',
  update,
  asyncHandler(reorderErpIndustryBenefitsController),
);
router.get('/benefits/:id', read, asyncHandler(getErpIndustryBenefitByIdController));
router.put('/benefits/:id', update, asyncHandler(updateErpIndustryBenefitController));
router.put(
  '/benefits/:id/status',
  update,
  asyncHandler(updateErpIndustryBenefitStatusController),
);
router.delete(
  '/benefits/:id',
  destroy,
  asyncHandler(deleteErpIndustryBenefitController),
);

/*
 * 'industries/reorder' and 'industries/benefits' are declared before
 * 'industries/:id' - Express matches in registration order, so the reverse
 * would parse them as ids and fail UUID validation.
 */
router.get('/industries', read, asyncHandler(getAllErpIndustriesController));
router.post('/industries', create, asyncHandler(createErpIndustryController));
router.put(
  '/industries/reorder',
  update,
  asyncHandler(reorderErpIndustriesController),
);
router.get('/industries/:id', read, asyncHandler(getErpIndustryByIdController));
router.put('/industries/:id', update, asyncHandler(updateErpIndustryController));
router.put(
  '/industries/:id/status',
  update,
  asyncHandler(updateErpIndustryStatusController),
);
router.delete('/industries/:id', destroy, asyncHandler(deleteErpIndustryController));

router.get(
  '/industries/:id/features',
  read,
  asyncHandler(getErpIndustryFeaturesController),
);
router.post(
  '/industries/:id/features',
  create,
  asyncHandler(createErpIndustryFeatureController),
);
router.put(
  '/industries/:id/features/reorder',
  update,
  asyncHandler(reorderErpIndustryFeaturesController),
);
router.get(
  '/industries/:id/features/:featureId',
  read,
  asyncHandler(getErpIndustryFeatureByIdController),
);
router.put(
  '/industries/:id/features/:featureId',
  update,
  asyncHandler(updateErpIndustryFeatureController),
);
router.put(
  '/industries/:id/features/:featureId/status',
  update,
  asyncHandler(updateErpIndustryFeatureStatusController),
);
router.delete(
  '/industries/:id/features/:featureId',
  destroy,
  asyncHandler(deleteErpIndustryFeatureController),
);

export default router;

/** The website-facing read: the whole section in one response. */
export const publicErpRecognitionSectionRouter = Router();

publicErpRecognitionSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicErpRecognitionSectionController),
);
