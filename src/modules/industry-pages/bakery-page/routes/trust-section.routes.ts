// src/modules/industry-pages/bakery-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBakeryTrustLogoController,
  createBakeryTrustStatController,
  deleteBakeryTrustLogoController,
  deleteBakeryTrustStatController,
  getAllBakeryTrustLogosController,
  getAllBakeryTrustStatsController,
  getBakeryTrustLogoByIdController,
  getBakeryTrustStatByIdController,
  getPublicBakeryTrustSectionController,
  reorderBakeryTrustLogosController,
  reorderBakeryTrustStatsController,
  updateBakeryTrustLogoController,
  updateBakeryTrustLogoStatusController,
  updateBakeryTrustStatController,
  updateBakeryTrustStatStatusController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Two lists under one mount - the logos and the figures - because they are one
 * band on the page but separate edits. The copy above them is served by the
 * shared section-copy router under ('bakery', 'trust').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/logos', read, asyncHandler(getAllBakeryTrustLogosController));
router.post('/logos', create, asyncHandler(createBakeryTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderBakeryTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getBakeryTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateBakeryTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateBakeryTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteBakeryTrustLogoController));

router.get('/stats', read, asyncHandler(getAllBakeryTrustStatsController));
router.post('/stats', create, asyncHandler(createBakeryTrustStatController));
router.put('/stats/reorder', update, asyncHandler(reorderBakeryTrustStatsController));
router.get('/stats/:id', read, asyncHandler(getBakeryTrustStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateBakeryTrustStatController));
router.put('/stats/:id/status', update, asyncHandler(updateBakeryTrustStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteBakeryTrustStatController));

export default router;

/** The website-facing read: the copy, the logos and the figures. */
export const publicBakeryTrustSectionRouter = Router();

publicBakeryTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBakeryTrustSectionController),
);
