// src/modules/product-pages/wms-page/routes/capabilities-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createWmsCapabilityModuleController,
  deleteWmsCapabilityModuleController,
  getAllWmsCapabilityModulesController,
  getPublicWmsCapabilitiesSectionController,
  getWmsCapabilityModuleByIdController,
  reorderWmsCapabilityModulesController,
  updateWmsCapabilityModuleController,
  updateWmsCapabilityModuleStatusController,
} from '../controllers/capabilities-section.controller';

/**
 * Admin router for the capability stack.
 *
 * One group: the section is a heading over a list, and the list is flat -
 * unlike the proof row, whose slides are nested under their card.
 *
 * The copy that heads it is not here - it is served by the shared
 * section-copy router under ('wms', 'capabilities').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllWmsCapabilityModulesController));
router.post('/', create, asyncHandler(createWmsCapabilityModuleController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderWmsCapabilityModulesController));
router.get('/:id', read, asyncHandler(getWmsCapabilityModuleByIdController));
router.put('/:id', update, asyncHandler(updateWmsCapabilityModuleController));
router.put('/:id/status', update, asyncHandler(updateWmsCapabilityModuleStatusController));
router.delete('/:id', destroy, asyncHandler(deleteWmsCapabilityModuleController));

export default router;

/** The website-facing read: the copy and the bands, in one call. */
export const publicWmsCapabilitiesSectionRouter = Router();

publicWmsCapabilitiesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWmsCapabilitiesSectionController),
);
