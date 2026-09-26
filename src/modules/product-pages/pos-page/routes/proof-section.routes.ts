// src/modules/product-pages/pos-page/routes/proof-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createPosProofLogoController,
  createPosProofStatController,
  deletePosProofLogoController,
  deletePosProofStatController,
  getAllPosProofLogosController,
  getAllPosProofStatsController,
  getPosIconsController,
  getPosProofLogoByIdController,
  getPosProofStatByIdController,
  getPublicPosProofSectionController,
  reorderPosProofLogosController,
  reorderPosProofStatsController,
  updatePosProofLogoController,
  updatePosProofLogoStatusController,
  updatePosProofStatController,
  updatePosProofStatStatusController,
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

router.get('/icons', read, asyncHandler(getPosIconsController));

// The brand wall.
router.get('/logos', read, asyncHandler(getAllPosProofLogosController));
router.post('/logos', create, asyncHandler(createPosProofLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderPosProofLogosController));
router.get('/logos/:id', read, asyncHandler(getPosProofLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updatePosProofLogoController));
router.put('/logos/:id/status', update, asyncHandler(updatePosProofLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deletePosProofLogoController));

// The figures.
router.get('/stats', read, asyncHandler(getAllPosProofStatsController));
router.post('/stats', create, asyncHandler(createPosProofStatController));
router.put('/stats/reorder', update, asyncHandler(reorderPosProofStatsController));
router.get('/stats/:id', read, asyncHandler(getPosProofStatByIdController));
router.put('/stats/:id', update, asyncHandler(updatePosProofStatController));
router.put('/stats/:id/status', update, asyncHandler(updatePosProofStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deletePosProofStatController));

export default router;

/** The website-facing read: the copy, the wall and the figures, in one call. */
export const publicPosProofSectionRouter = Router();

publicPosProofSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicPosProofSectionController),
);
