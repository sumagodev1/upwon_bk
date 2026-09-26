// src/modules/industry-pages/spices-agro-page/routes/capabilities-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSpicesAgroCapabilityController,
  deleteSpicesAgroCapabilityController,
  getAllSpicesAgroCapabilitiesController,
  getSpicesAgroCapabilitiesPanelController,
  getSpicesAgroIconsController,
  getSpicesAgroCapabilityByIdController,
  getPublicSpicesAgroCapabilitiesSectionController,
  reorderSpicesAgroCapabilitiesController,
  updateSpicesAgroCapabilitiesPanelController,
  updateSpicesAgroCapabilityController,
  updateSpicesAgroCapabilityStatusController,
} from '../controllers/capabilities-section.controller';

/**
 * Admin router for the core capabilities.
 *
 * The seven routes a list section gets, the background panel read and
 * replaced as one record, and the icon names for the picker. The copy is
 * served by the shared section-copy router under ('spices-agro', 'capabilities').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getSpicesAgroIconsController));
router.get('/panel', read, asyncHandler(getSpicesAgroCapabilitiesPanelController));
router.put('/panel', update, asyncHandler(updateSpicesAgroCapabilitiesPanelController));
router.get('/', read, asyncHandler(getAllSpicesAgroCapabilitiesController));
router.post('/', create, asyncHandler(createSpicesAgroCapabilityController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderSpicesAgroCapabilitiesController));
router.get('/:id', read, asyncHandler(getSpicesAgroCapabilityByIdController));
router.put('/:id', update, asyncHandler(updateSpicesAgroCapabilityController));
router.put('/:id/status', update, asyncHandler(updateSpicesAgroCapabilityStatusController));
router.delete('/:id', destroy, asyncHandler(deleteSpicesAgroCapabilityController));

export default router;

/** The website-facing read: the copy, the background and the capabilities, in one call. */
export const publicSpicesAgroCapabilitiesSectionRouter = Router();

publicSpicesAgroCapabilitiesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSpicesAgroCapabilitiesSectionController),
);
