// src/modules/industry-pages/engineering-manufacturing-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createEngineeringTrustLogoController,
  createEngineeringTrustCardController,
  deleteEngineeringTrustLogoController,
  deleteEngineeringTrustCardController,
  getAllEngineeringTrustLogosController,
  getAllEngineeringTrustCardsController,
  getEngineeringIconsController,
  getEngineeringTrustLogoByIdController,
  getEngineeringTrustCardByIdController,
  getPublicEngineeringTrustSectionController,
  reorderEngineeringTrustLogosController,
  reorderEngineeringTrustCardsController,
  updateEngineeringTrustLogoController,
  updateEngineeringTrustLogoStatusController,
  updateEngineeringTrustCardController,
  updateEngineeringTrustCardStatusController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Two groups under one mount: the logo marquee and the figure cards. They
 * are one band on the page but two separate edits, which is why they are not
 * one form.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/icons', read, asyncHandler(getEngineeringIconsController));

// The logo marquee.
router.get('/logos', read, asyncHandler(getAllEngineeringTrustLogosController));
router.post('/logos', create, asyncHandler(createEngineeringTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderEngineeringTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getEngineeringTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateEngineeringTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateEngineeringTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteEngineeringTrustLogoController));

// The figure cards.
router.get('/cards', read, asyncHandler(getAllEngineeringTrustCardsController));
router.post('/cards', create, asyncHandler(createEngineeringTrustCardController));
router.put('/cards/reorder', update, asyncHandler(reorderEngineeringTrustCardsController));
router.get('/cards/:id', read, asyncHandler(getEngineeringTrustCardByIdController));
router.put('/cards/:id', update, asyncHandler(updateEngineeringTrustCardController));
router.put('/cards/:id/status', update, asyncHandler(updateEngineeringTrustCardStatusController));
router.delete('/cards/:id', destroy, asyncHandler(deleteEngineeringTrustCardController));

export default router;

/** The website-facing read: the copy, the cards and the logos, in one call. */
export const publicEngineeringTrustSectionRouter = Router();

publicEngineeringTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicEngineeringTrustSectionController),
);
