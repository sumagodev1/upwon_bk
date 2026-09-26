// src/modules/industry-pages/spices-agro-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSpicesAgroPlatformGroupController,
  deleteSpicesAgroPlatformGroupController,
  getAllSpicesAgroPlatformGroupsController,
  getSpicesAgroPlatformPanelController,
  getSpicesAgroPlatformGroupByIdController,
  getPublicSpicesAgroPlatformSectionController,
  reorderSpicesAgroPlatformGroupsController,
  updateSpicesAgroPlatformPanelController,
  updateSpicesAgroPlatformGroupController,
  updateSpicesAgroPlatformGroupStatusController,
} from '../controllers/platform-section.controller';
import { getSpicesAgroIconsController } from '../controllers/capabilities-section.controller';

/**
 * Admin router for the connected platform section.
 *
 * The seven routes a list section gets, the background panel read and
 * replaced as one record, and the icon names for the picker - the same
 * allowlist the core capabilities use. The copy is
 * served by the shared section-copy router under ('spices-agro', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getSpicesAgroIconsController));
router.get('/panel', read, asyncHandler(getSpicesAgroPlatformPanelController));
router.put('/panel', update, asyncHandler(updateSpicesAgroPlatformPanelController));
router.get('/', read, asyncHandler(getAllSpicesAgroPlatformGroupsController));
router.post('/', create, asyncHandler(createSpicesAgroPlatformGroupController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderSpicesAgroPlatformGroupsController));
router.get('/:id', read, asyncHandler(getSpicesAgroPlatformGroupByIdController));
router.put('/:id', update, asyncHandler(updateSpicesAgroPlatformGroupController));
router.put('/:id/status', update, asyncHandler(updateSpicesAgroPlatformGroupStatusController));
router.delete('/:id', destroy, asyncHandler(deleteSpicesAgroPlatformGroupController));

export default router;

/** The website-facing read: the copy, the background and the groups, in one call. */
export const publicSpicesAgroPlatformSectionRouter = Router();

publicSpicesAgroPlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSpicesAgroPlatformSectionController),
);
