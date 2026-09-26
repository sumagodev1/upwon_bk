// src/modules/industry-pages/beverage-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBeverageTrustLogoController,
  createBeverageTrustStatController,
  deleteBeverageTrustLogoController,
  deleteBeverageTrustStatController,
  getAllBeverageTrustLogosController,
  getAllBeverageTrustStatsController,
  getBeverageTrustLogoByIdController,
  getBeverageTrustStatByIdController,
  getPublicBeverageTrustSectionController,
  reorderBeverageTrustLogosController,
  reorderBeverageTrustStatsController,
  updateBeverageTrustLogoController,
  updateBeverageTrustLogoStatusController,
  updateBeverageTrustStatController,
  updateBeverageTrustStatStatusController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Two groups under one mount: the logo marquee and the stats. They
 * are one band on the page but two separate edits, which is why they are not
 * one form.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The logo marquee.
router.get('/logos', read, asyncHandler(getAllBeverageTrustLogosController));
router.post('/logos', create, asyncHandler(createBeverageTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderBeverageTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getBeverageTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateBeverageTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateBeverageTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteBeverageTrustLogoController));

// The stats.
router.get('/stats', read, asyncHandler(getAllBeverageTrustStatsController));
router.post('/stats', create, asyncHandler(createBeverageTrustStatController));
router.put('/stats/reorder', update, asyncHandler(reorderBeverageTrustStatsController));
router.get('/stats/:id', read, asyncHandler(getBeverageTrustStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateBeverageTrustStatController));
router.put('/stats/:id/status', update, asyncHandler(updateBeverageTrustStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteBeverageTrustStatController));

export default router;

/** The website-facing read: the copy, the stats and the logos, in one call. */
export const publicBeverageTrustSectionRouter = Router();

publicBeverageTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBeverageTrustSectionController),
);
