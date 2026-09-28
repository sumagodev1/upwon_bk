// src/modules/industry-pages/qsr-franchise-page/routes/capabilities-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createQsrFranchiseCapabilityController,
  deleteQsrFranchiseCapabilityController,
  getAllQsrFranchiseCapabilitiesController,
  getQsrFranchiseCapabilitiesPanelController,
  getQsrFranchiseIconsController,
  getQsrFranchiseCapabilityByIdController,
  getPublicQsrFranchiseCapabilitiesSectionController,
  reorderQsrFranchiseCapabilitiesController,
  updateQsrFranchiseCapabilitiesPanelController,
  updateQsrFranchiseCapabilityController,
  updateQsrFranchiseCapabilityStatusController,
} from '../controllers/capabilities-section.controller';

/**
 * Admin router for the core capabilities.
 *
 * The seven routes a list section gets, the artwork panel read and
 * replaced as one record, and the icon names for the picker. The copy is
 * served by the shared section-copy router under ('qsr-franchise', 'capabilities').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getQsrFranchiseIconsController));
router.get('/panel', read, asyncHandler(getQsrFranchiseCapabilitiesPanelController));
router.put('/panel', update, asyncHandler(updateQsrFranchiseCapabilitiesPanelController));
router.get('/', read, asyncHandler(getAllQsrFranchiseCapabilitiesController));
router.post('/', create, asyncHandler(createQsrFranchiseCapabilityController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderQsrFranchiseCapabilitiesController));
router.get('/:id', read, asyncHandler(getQsrFranchiseCapabilityByIdController));
router.put('/:id', update, asyncHandler(updateQsrFranchiseCapabilityController));
router.put('/:id/status', update, asyncHandler(updateQsrFranchiseCapabilityStatusController));
router.delete('/:id', destroy, asyncHandler(deleteQsrFranchiseCapabilityController));

export default router;

/** The website-facing read: the copy, the artwork and the capabilities, in one call. */
export const publicQsrFranchiseCapabilitiesSectionRouter = Router();

publicQsrFranchiseCapabilitiesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicQsrFranchiseCapabilitiesSectionController),
);
