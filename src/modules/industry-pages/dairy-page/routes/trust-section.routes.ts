// src/modules/industry-pages/dairy-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createDairyTrustLogoController,
  createDairyTrustStatController,
  deleteDairyTrustLogoController,
  deleteDairyTrustStatController,
  getAllDairyTrustLogosController,
  getAllDairyTrustStatsController,
  getDairyTrustLogoByIdController,
  getDairyTrustStatByIdController,
  getPublicDairyTrustSectionController,
  reorderDairyTrustLogosController,
  reorderDairyTrustStatsController,
  updateDairyTrustLogoController,
  updateDairyTrustLogoStatusController,
  updateDairyTrustStatController,
  updateDairyTrustStatStatusController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Two lists under one mount - the logos and the figures - because they are one
 * band on the page but separate edits. The copy above them is served by the
 * shared section-copy router under ('dairy', 'trust').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/logos', read, asyncHandler(getAllDairyTrustLogosController));
router.post('/logos', create, asyncHandler(createDairyTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderDairyTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getDairyTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateDairyTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateDairyTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteDairyTrustLogoController));

router.get('/stats', read, asyncHandler(getAllDairyTrustStatsController));
router.post('/stats', create, asyncHandler(createDairyTrustStatController));
router.put('/stats/reorder', update, asyncHandler(reorderDairyTrustStatsController));
router.get('/stats/:id', read, asyncHandler(getDairyTrustStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateDairyTrustStatController));
router.put('/stats/:id/status', update, asyncHandler(updateDairyTrustStatStatusController));
router.delete('/stats/:id', destroy, asyncHandler(deleteDairyTrustStatController));

export default router;

/** The website-facing read: the copy, the logos and the figures. */
export const publicDairyTrustSectionRouter = Router();

publicDairyTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicDairyTrustSectionController),
);
