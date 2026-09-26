// src/modules/industry-pages/qsr-franchise-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createQsrFranchiseTrustLogoController,
  createQsrFranchiseTrustStatController,
  deleteQsrFranchiseTrustLogoController,
  deleteQsrFranchiseTrustStatController,
  getAllQsrFranchiseTrustLogosController,
  getAllQsrFranchiseTrustStatsController,
  getQsrFranchiseIconsController,
  getQsrFranchiseTrustPanelController,
  getQsrFranchiseTrustLogoByIdController,
  getQsrFranchiseTrustStatByIdController,
  getPublicQsrFranchiseTrustSectionController,
  reorderQsrFranchiseTrustLogosController,
  reorderQsrFranchiseTrustStatsController,
  updateQsrFranchiseTrustLogoController,
  updateQsrFranchiseTrustLogoStatusController,
  updateQsrFranchiseTrustStatController,
  updateQsrFranchiseTrustStatStatusController,
  updateQsrFranchiseTrustPanelController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Three groups under one mount: the logo marquee, the stat tiles and the
 * photographs. They are one band on the page but three separate edits, which
 * is why they are not one form.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The logo marquee.
router.get('/logos', read, asyncHandler(getAllQsrFranchiseTrustLogosController));
router.post('/logos', create, asyncHandler(createQsrFranchiseTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderQsrFranchiseTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getQsrFranchiseTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateQsrFranchiseTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateQsrFranchiseTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteQsrFranchiseTrustLogoController));

// The stat tiles.
router.get('/icons', read, asyncHandler(getQsrFranchiseIconsController));
router.get('/stats', read, asyncHandler(getAllQsrFranchiseTrustStatsController));
router.post('/stats', create, asyncHandler(createQsrFranchiseTrustStatController));
router.put('/stats/reorder', update, asyncHandler(reorderQsrFranchiseTrustStatsController));
router.get('/stats/:id', read, asyncHandler(getQsrFranchiseTrustStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateQsrFranchiseTrustStatController));
router.put('/stats/:id/status', update, asyncHandler(updateQsrFranchiseTrustStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteQsrFranchiseTrustStatController));

// The photographs.
router.get('/panel', read, asyncHandler(getQsrFranchiseTrustPanelController));
router.put('/panel', update, asyncHandler(updateQsrFranchiseTrustPanelController));

export default router;

/** The website-facing read: the copy, the logos, the stats and the photographs, in one call. */
export const publicQsrFranchiseTrustSectionRouter = Router();

publicQsrFranchiseTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicQsrFranchiseTrustSectionController),
);
