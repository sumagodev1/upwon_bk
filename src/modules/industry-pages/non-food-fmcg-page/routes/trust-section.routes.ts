// src/modules/industry-pages/non-food-fmcg-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createNonFoodFmcgTrustLogoController,
  createNonFoodFmcgTrustStatController,
  deleteNonFoodFmcgTrustLogoController,
  deleteNonFoodFmcgTrustStatController,
  getAllNonFoodFmcgTrustLogosController,
  getAllNonFoodFmcgTrustStatsController,
  getNonFoodFmcgTrustLogoByIdController,
  getNonFoodFmcgTrustStatByIdController,
  getPublicNonFoodFmcgTrustSectionController,
  reorderNonFoodFmcgTrustLogosController,
  reorderNonFoodFmcgTrustStatsController,
  updateNonFoodFmcgTrustLogoController,
  updateNonFoodFmcgTrustLogoStatusController,
  updateNonFoodFmcgTrustStatController,
  updateNonFoodFmcgTrustStatStatusController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Two lists under one mount - the logos and the figures - because they are one
 * band on the page but separate edits. The copy above them is served by the
 * shared section-copy router under ('non-food-fmcg', 'trust').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/logos', read, asyncHandler(getAllNonFoodFmcgTrustLogosController));
router.post('/logos', create, asyncHandler(createNonFoodFmcgTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderNonFoodFmcgTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getNonFoodFmcgTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateNonFoodFmcgTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateNonFoodFmcgTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteNonFoodFmcgTrustLogoController));

router.get('/stats', read, asyncHandler(getAllNonFoodFmcgTrustStatsController));
router.post('/stats', create, asyncHandler(createNonFoodFmcgTrustStatController));
router.put('/stats/reorder', update, asyncHandler(reorderNonFoodFmcgTrustStatsController));
router.get('/stats/:id', read, asyncHandler(getNonFoodFmcgTrustStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateNonFoodFmcgTrustStatController));
router.put('/stats/:id/status', update, asyncHandler(updateNonFoodFmcgTrustStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteNonFoodFmcgTrustStatController));

export default router;

/** The website-facing read: the copy, the logos and the figures. */
export const publicNonFoodFmcgTrustSectionRouter = Router();

publicNonFoodFmcgTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicNonFoodFmcgTrustSectionController),
);
