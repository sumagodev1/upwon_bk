// src/modules/industry-pages/bakery-page/routes/cta-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBakeryCtaFeatureController,
  deleteBakeryCtaFeatureController,
  getAllBakeryCtaFeaturesController,
  getBakeryCtaFeatureByIdController,
  getBakeryCtaIconsController,
  getBakeryCtaSectionController,
  getPublicBakeryCtaSectionController,
  reorderBakeryCtaFeaturesController,
  updateBakeryCtaFeatureController,
  updateBakeryCtaFeatureStatusController,
  updateBakeryCtaSectionController,
} from '../controllers/cta-section.controller';

/**
 * Admin router for the closing band.
 *
 * Two groups under one mount: the band itself at the root - one record, read
 * and replaced - and the capability marks under '/features' as their own list.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getBakeryCtaSectionController));
router.put('/', update, asyncHandler(updateBakeryCtaSectionController));

router.get('/icons', read, asyncHandler(getBakeryCtaIconsController));

router.get('/features', read, asyncHandler(getAllBakeryCtaFeaturesController));
router.post('/features', create, asyncHandler(createBakeryCtaFeatureController));
/*
 * Declared before '/features/:id' - Express matches in registration order, so
 * the reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/features/reorder', update, asyncHandler(reorderBakeryCtaFeaturesController));
router.get('/features/:id', read, asyncHandler(getBakeryCtaFeatureByIdController));
router.put('/features/:id', update, asyncHandler(updateBakeryCtaFeatureController));
router.put('/features/:id/status', update, asyncHandler(updateBakeryCtaFeatureStatusController));
router.delete('/features/:id', destroy, asyncHandler(deleteBakeryCtaFeatureController));

export default router;

/** The website-facing read. Null when the band has never been authored. */
export const publicBakeryCtaSectionRouter = Router();

publicBakeryCtaSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBakeryCtaSectionController),
);
