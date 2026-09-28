// src/modules/product-pages/vendor-portal-page/routes/capabilities-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createVmsCapabilityCardController,
  deleteVmsCapabilityCardController,
  getAllVmsCapabilityCardsController,
  getPublicVmsCapabilitiesSectionController,
  getVmsCapabilityCardByIdController,
  reorderVmsCapabilityCardsController,
  updateVmsCapabilityCardController,
  updateVmsCapabilityCardStatusController,
} from '../controllers/capabilities-section.controller';

/**
 * Admin router for the capability carousel.
 *
 * The copy that heads it is not here - it is served by the shared
 * section-copy router under ('vms', 'capabilities').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllVmsCapabilityCardsController));
router.post('/', create, asyncHandler(createVmsCapabilityCardController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderVmsCapabilityCardsController));
router.get('/:id', read, asyncHandler(getVmsCapabilityCardByIdController));
router.put('/:id', update, asyncHandler(updateVmsCapabilityCardController));
router.put('/:id/status', update, asyncHandler(updateVmsCapabilityCardStatusController));
router.delete('/:id', destroy, asyncHandler(deleteVmsCapabilityCardController));

export default router;

/** The website-facing read: the copy and the cards, in one call. */
export const publicVmsCapabilitiesSectionRouter = Router();

publicVmsCapabilitiesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicVmsCapabilitiesSectionController),
);
