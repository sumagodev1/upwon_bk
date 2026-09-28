// src/modules/industry-pages/beverage-page/routes/capabilities-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBeverageCapabilityController,
  deleteBeverageCapabilityController,
  getAllBeverageCapabilitiesController,
  getBeverageCapabilitiesPanelController,
  getBeverageCapabilityByIdController,
  getPublicBeverageCapabilitiesSectionController,
  reorderBeverageCapabilitiesController,
  updateBeverageCapabilitiesPanelController,
  updateBeverageCapabilityController,
  updateBeverageCapabilityStatusController,
} from '../controllers/capabilities-section.controller';

/**
 * Admin router for the core capabilities.
 *
 * Two groups under one mount: the background panel, read and replaced as one
 * record, and the capabilities, a list. The copy is served by the shared
 * section-copy router under ('beverage', 'capabilities').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The background panel.
router.get('/panel', read, asyncHandler(getBeverageCapabilitiesPanelController));
router.put('/panel', update, asyncHandler(updateBeverageCapabilitiesPanelController));

// The capabilities.
router.get('/capabilities', read, asyncHandler(getAllBeverageCapabilitiesController));
router.post('/capabilities', create, asyncHandler(createBeverageCapabilityController));
/*
 * Declared before '/capabilities/:id' - Express matches in registration order,
 * so the reverse would make 'reorder' get parsed as an id and fail UUID
 * validation.
 */
router.put(
  '/capabilities/reorder',
  update,
  asyncHandler(reorderBeverageCapabilitiesController),
);
router.get('/capabilities/:id', read, asyncHandler(getBeverageCapabilityByIdController));
router.put('/capabilities/:id', update, asyncHandler(updateBeverageCapabilityController));
router.put(
  '/capabilities/:id/status',
  update,
  asyncHandler(updateBeverageCapabilityStatusController),
);
router.delete('/capabilities/:id', destroy, asyncHandler(deleteBeverageCapabilityController));

export default router;

/** The website-facing read: the copy, the background and the capabilities, in one call. */
export const publicBeverageCapabilitiesSectionRouter = Router();

publicBeverageCapabilitiesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBeverageCapabilitiesSectionController),
);
