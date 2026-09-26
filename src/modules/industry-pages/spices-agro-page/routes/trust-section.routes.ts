// src/modules/industry-pages/spices-agro-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSpicesAgroTrustLogoController,
  deleteSpicesAgroTrustLogoController,
  getAllSpicesAgroTrustLogosController,
  getPublicSpicesAgroTrustSectionController,
  getSpicesAgroTrustLogoByIdController,
  getSpicesAgroTrustPanelController,
  reorderSpicesAgroTrustLogosController,
  updateSpicesAgroTrustLogoController,
  updateSpicesAgroTrustLogoStatusController,
  updateSpicesAgroTrustPanelController,
} from '../controllers/trust-section.controller';

/**
 * Admin router for the trust section.
 *
 * Two groups under one mount: the logo marquee and the product panel. They
 * are one band on the page but two separate edits, which is why they are not
 * one form.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The logo marquee.
router.get('/logos', read, asyncHandler(getAllSpicesAgroTrustLogosController));
router.post('/logos', create, asyncHandler(createSpicesAgroTrustLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderSpicesAgroTrustLogosController));
router.get('/logos/:id', read, asyncHandler(getSpicesAgroTrustLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateSpicesAgroTrustLogoController));
router.put('/logos/:id/status', update, asyncHandler(updateSpicesAgroTrustLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deleteSpicesAgroTrustLogoController));

// The product panel.
router.get('/panel', read, asyncHandler(getSpicesAgroTrustPanelController));
router.put('/panel', update, asyncHandler(updateSpicesAgroTrustPanelController));

export default router;

/** The website-facing read: the copy, the logos and the panel, in one call. */
export const publicSpicesAgroTrustSectionRouter = Router();

publicSpicesAgroTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSpicesAgroTrustSectionController),
);
