// src/modules/product-pages/erp-page/routes/establishers-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createErpEstablisherBadgeController,
  deleteErpEstablisherBadgeController,
  getAllErpEstablisherBadgesController,
  getErpEstablisherBadgeByIdController,
  getPublicErpEstablishersSectionController,
  reorderErpEstablisherBadgesController,
  updateErpEstablisherBadgeController,
  updateErpEstablisherBadgeStatusController,
} from '../controllers/establishers-section.controller';

/**
 * Admin router for the trust establishers.
 *
 * Only the badges are editable here. The sphere beside them draws the home
 * page's integration logos, so it is edited on that section's screen - one
 * list, two pages.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllErpEstablisherBadgesController));
router.post('/', create, asyncHandler(createErpEstablisherBadgeController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderErpEstablisherBadgesController));
router.get('/:id', read, asyncHandler(getErpEstablisherBadgeByIdController));
router.put('/:id', update, asyncHandler(updateErpEstablisherBadgeController));
router.put('/:id/status', update, asyncHandler(updateErpEstablisherBadgeStatusController));
router.delete('/:id', destroy, asyncHandler(deleteErpEstablisherBadgeController));

export default router;

/** The website-facing read: the copy, the badges and the sphere, in one call. */
export const publicErpEstablishersSectionRouter = Router();

publicErpEstablishersSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicErpEstablishersSectionController),
);
