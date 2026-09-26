// src/modules/industry-pages/engineering-manufacturing-page/routes/capabilities-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createEngineeringCapabilityController,
  deleteEngineeringCapabilityController,
  getAllEngineeringCapabilitiesController,
  getEngineeringCapabilityByIdController,
  getPublicEngineeringCapabilitiesController,
  reorderEngineeringCapabilitiesController,
  updateEngineeringCapabilityController,
  updateEngineeringCapabilityStatusController,
} from '../controllers/capabilities-section.controller';
import { getEngineeringIconsController } from '../controllers/trust-section.controller';

/**
 * Admin router for the core capabilities.
 *
 * The seven routes a list section gets, plus the icon names for the picker -
 * the same allowlist the trust section's cards use. The copy that heads the
 * section is served by the shared section-copy router under
 * ('engineering-manufacturing', 'capabilities').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getEngineeringIconsController));
router.get('/', read, asyncHandler(getAllEngineeringCapabilitiesController));
router.post('/', create, asyncHandler(createEngineeringCapabilityController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderEngineeringCapabilitiesController));
router.get('/:id', read, asyncHandler(getEngineeringCapabilityByIdController));
router.put('/:id', update, asyncHandler(updateEngineeringCapabilityController));
router.put('/:id/status', update, asyncHandler(updateEngineeringCapabilityStatusController));
router.delete('/:id', destroy, asyncHandler(deleteEngineeringCapabilityController));

export default router;

/** The website-facing read: the copy and the capabilities, in one call. */
export const publicEngineeringCapabilitiesSectionRouter = Router();

publicEngineeringCapabilitiesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicEngineeringCapabilitiesController),
);
