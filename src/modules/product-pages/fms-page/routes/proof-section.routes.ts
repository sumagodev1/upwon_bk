// src/modules/product-pages/fms-page/routes/proof-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmsProofLogoController,
  createFmsProofStatController,
  deleteFmsProofLogoController,
  deleteFmsProofStatController,
  getAllFmsProofLogosController,
  getAllFmsProofStatsController,
  getFmsIconsController,
  getFmsProofLogoByIdController,
  getFmsProofStatByIdController,
  getPublicFmsProofSectionController,
  reorderFmsProofLogosController,
  reorderFmsProofStatsController,
  updateFmsProofLogoController,
  updateFmsProofLogoStatusController,
  updateFmsProofStatController,
  updateFmsProofStatStatusController,
} from '../controllers/proof-section.controller';

/**
 * Admin router for the proof strip.
 *
 * Two groups under one mount: the brand wall and the figures beside it. They
 * are one band on the page but two separate edits, which is why they are not
 * one form.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/icons', read, asyncHandler(getFmsIconsController));

// The brand wall.
router.get('/logos', read, asyncHandler(getAllFmsProofLogosController));
router.post('/logos', create, asyncHandler(createFmsProofLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderFmsProofLogosController));
router.get('/logos/:id', read, asyncHandler(getFmsProofLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateFmsProofLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateFmsProofLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteFmsProofLogoController));

// The figures.
router.get('/stats', read, asyncHandler(getAllFmsProofStatsController));
router.post('/stats', create, asyncHandler(createFmsProofStatController));
router.put('/stats/reorder', update, asyncHandler(reorderFmsProofStatsController));
router.get('/stats/:id', read, asyncHandler(getFmsProofStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateFmsProofStatController));
router.put('/stats/:id/status', update, asyncHandler(updateFmsProofStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteFmsProofStatController));

export default router;

/** The website-facing read: the copy, the wall and the figures, in one call. */
export const publicFmsProofSectionRouter = Router();

publicFmsProofSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmsProofSectionController),
);
