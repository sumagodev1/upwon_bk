// src/modules/industry-pages/sweets-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSweetsTrustLogoController,
  createSweetsTrustStatController,
  deleteSweetsTrustLogoController,
  deleteSweetsTrustStatController,
  getAllSweetsTrustLogosController,
  getAllSweetsTrustStatsController,
  getSweetsTrustIconsController,
  getSweetsTrustLogoByIdController,
  getSweetsTrustStatByIdController,
  getPublicSweetsTrustSectionController,
  reorderSweetsTrustLogosController,
  reorderSweetsTrustStatsController,
  updateSweetsTrustLogoController,
  updateSweetsTrustLogoStatusController,
  updateSweetsTrustStatController,
  updateSweetsTrustStatStatusController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Two lists under one mount - the logos and the figures - because they are one
 * band on the page but separate edits. The copy above them is served by the
 * shared section-copy router under ('sweets', 'trust').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/logos', read, asyncHandler(getAllSweetsTrustLogosController));
router.post('/logos', create, asyncHandler(createSweetsTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderSweetsTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getSweetsTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateSweetsTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateSweetsTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteSweetsTrustLogoController));

router.get('/icons', read, asyncHandler(getSweetsTrustIconsController));

router.get('/stats', read, asyncHandler(getAllSweetsTrustStatsController));
router.post('/stats', create, asyncHandler(createSweetsTrustStatController));
router.put('/stats/reorder', update, asyncHandler(reorderSweetsTrustStatsController));
router.get('/stats/:id', read, asyncHandler(getSweetsTrustStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateSweetsTrustStatController));
router.put('/stats/:id/status', update, asyncHandler(updateSweetsTrustStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteSweetsTrustStatController));

export default router;

/** The website-facing read: the copy, the logos and the figures. */
export const publicSweetsTrustSectionRouter = Router();

publicSweetsTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSweetsTrustSectionController),
);
