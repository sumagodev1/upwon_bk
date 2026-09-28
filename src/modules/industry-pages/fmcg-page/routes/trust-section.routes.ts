// src/modules/industry-pages/fmcg-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmcgTrustLogoController,
  createFmcgTrustStatController,
  deleteFmcgTrustLogoController,
  deleteFmcgTrustStatController,
  getAllFmcgTrustLogosController,
  getAllFmcgTrustStatsController,
  getFmcgTrustLogoByIdController,
  getFmcgTrustStatByIdController,
  getPublicFmcgTrustSectionController,
  reorderFmcgTrustLogosController,
  reorderFmcgTrustStatsController,
  updateFmcgTrustLogoController,
  updateFmcgTrustLogoStatusController,
  updateFmcgTrustStatController,
  updateFmcgTrustStatStatusController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Two lists under one mount - the logos and the figures - because they are one
 * band on the page but separate edits. The copy above them is served by the
 * shared section-copy router under ('fmcg', 'trust').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/logos', read, asyncHandler(getAllFmcgTrustLogosController));
router.post('/logos', create, asyncHandler(createFmcgTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderFmcgTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getFmcgTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateFmcgTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateFmcgTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteFmcgTrustLogoController));

router.get('/stats', read, asyncHandler(getAllFmcgTrustStatsController));
router.post('/stats', create, asyncHandler(createFmcgTrustStatController));
router.put('/stats/reorder', update, asyncHandler(reorderFmcgTrustStatsController));
router.get('/stats/:id', read, asyncHandler(getFmcgTrustStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateFmcgTrustStatController));
router.put('/stats/:id/status', update, asyncHandler(updateFmcgTrustStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteFmcgTrustStatController));

export default router;

/** The website-facing read: the copy, the logos and the figures. */
export const publicFmcgTrustSectionRouter = Router();

publicFmcgTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmcgTrustSectionController),
);
