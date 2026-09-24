// src/modules/product-pages/sfa-dms-page/routes/proof-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSfaProofLogoController,
  createSfaProofStatController,
  deleteSfaProofLogoController,
  deleteSfaProofStatController,
  getAllSfaProofLogosController,
  getAllSfaProofStatsController,
  getPublicSfaProofSectionController,
  getSfaProofLogoByIdController,
  getSfaProofPanelController,
  getSfaProofStatByIdController,
  reorderSfaProofLogosController,
  reorderSfaProofStatsController,
  updateSfaProofLogoController,
  updateSfaProofLogoStatusController,
  updateSfaProofStatController,
  updateSfaProofStatStatusController,
  upsertSfaProofPanelController,
} from '../controllers/proof-section.controller';

/**
 * Admin router for the proof section.
 *
 * Three groups under one mount: the card at the root, and the logos and the
 * figures as their own lists. They are one band on the page but three separate
 * edits, which is why they are not one form.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The card: one record, read and replaced.
router.get('/panel', read, asyncHandler(getSfaProofPanelController));
router.put('/panel', update, asyncHandler(upsertSfaProofPanelController));

// The logos.
router.get('/logos', read, asyncHandler(getAllSfaProofLogosController));
router.post('/logos', create, asyncHandler(createSfaProofLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderSfaProofLogosController));
router.get('/logos/:id', read, asyncHandler(getSfaProofLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateSfaProofLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateSfaProofLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteSfaProofLogoController));

// The figures.
router.get('/stats', read, asyncHandler(getAllSfaProofStatsController));
router.post('/stats', create, asyncHandler(createSfaProofStatController));
router.put('/stats/reorder', update, asyncHandler(reorderSfaProofStatsController));
router.get('/stats/:id', read, asyncHandler(getSfaProofStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateSfaProofStatController));
router.put('/stats/:id/status', update, asyncHandler(updateSfaProofStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteSfaProofStatController));

export default router;

/** The website-facing read: the copy, the card, the logos and the figures. */
export const publicSfaProofSectionRouter = Router();

publicSfaProofSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSfaProofSectionController),
);
