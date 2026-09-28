// src/modules/product-pages/vendor-portal-page/routes/outcomes-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createVmsOutcomeVideoController,
  deleteVmsOutcomeVideoController,
  getAllVmsOutcomeVideosController,
  getPublicVmsOutcomesSectionController,
  getVmsOutcomeVideoByIdController,
  reorderVmsOutcomeVideosController,
  updateVmsOutcomeVideoController,
  updateVmsOutcomeVideoStatusController,
} from '../controllers/outcomes-section.controller';

/**
 * Admin router for the customer-outcome showcase.
 *
 * One group: a tab and the panel it opens are one row, because nothing else
 * points at either half.
 *
 * The copy that heads it is not here - it is served by the shared
 * section-copy router under ('vms', 'outcomes').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllVmsOutcomeVideosController));
router.post('/', create, asyncHandler(createVmsOutcomeVideoController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderVmsOutcomeVideosController));
router.get('/:id', read, asyncHandler(getVmsOutcomeVideoByIdController));
router.put('/:id', update, asyncHandler(updateVmsOutcomeVideoController));
router.put('/:id/status', update, asyncHandler(updateVmsOutcomeVideoStatusController));
router.delete('/:id', destroy, asyncHandler(deleteVmsOutcomeVideoController));

export default router;

/** The website-facing read: the copy and the tabs, in one call. */
export const publicVmsOutcomesSectionRouter = Router();

publicVmsOutcomesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicVmsOutcomesSectionController),
);
