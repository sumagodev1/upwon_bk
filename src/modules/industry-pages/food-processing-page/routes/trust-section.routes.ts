// src/modules/industry-pages/food-processing-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFoodProcessingTrustLogoController,
  createFoodProcessingTrustStatController,
  deleteFoodProcessingTrustLogoController,
  deleteFoodProcessingTrustStatController,
  getAllFoodProcessingTrustLogosController,
  getAllFoodProcessingTrustStatsController,
  getFoodProcessingTrustLogoByIdController,
  getFoodProcessingTrustPanelController,
  getFoodProcessingTrustStatByIdController,
  getPublicFoodProcessingTrustSectionController,
  reorderFoodProcessingTrustLogosController,
  reorderFoodProcessingTrustStatsController,
  updateFoodProcessingTrustLogoController,
  updateFoodProcessingTrustLogoStatusController,
  updateFoodProcessingTrustStatController,
  updateFoodProcessingTrustStatStatusController,
  upsertFoodProcessingTrustPanelController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Two lists under one mount - the logos and the figures - because they are one
 * band on the page but separate edits. The copy above them is served by the
 * shared section-copy router under ('food-processing', 'trust').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The photograph beside the figures: one record, read and replaced.
router.get('/panel', read, asyncHandler(getFoodProcessingTrustPanelController));
router.put('/panel', update, asyncHandler(upsertFoodProcessingTrustPanelController));

router.get('/logos', read, asyncHandler(getAllFoodProcessingTrustLogosController));
router.post('/logos', create, asyncHandler(createFoodProcessingTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderFoodProcessingTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getFoodProcessingTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateFoodProcessingTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateFoodProcessingTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteFoodProcessingTrustLogoController));

router.get('/stats', read, asyncHandler(getAllFoodProcessingTrustStatsController));
router.post('/stats', create, asyncHandler(createFoodProcessingTrustStatController));
router.put('/stats/reorder', update, asyncHandler(reorderFoodProcessingTrustStatsController));
router.get('/stats/:id', read, asyncHandler(getFoodProcessingTrustStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateFoodProcessingTrustStatController));
router.put('/stats/:id/status', update, asyncHandler(updateFoodProcessingTrustStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteFoodProcessingTrustStatController));

export default router;

/** The website-facing read: the copy, the logos and the figures. */
export const publicFoodProcessingTrustSectionRouter = Router();

publicFoodProcessingTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFoodProcessingTrustSectionController),
);
