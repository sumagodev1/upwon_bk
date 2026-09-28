// src/modules/industry-pages/bakery-page/routes/helps-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBakeryHelpVisualController,
  deleteBakeryHelpVisualController,
  getAllBakeryHelpVisualsController,
  getBakeryHelpVisualByIdController,
  getPublicBakeryHelpsSectionController,
  reorderBakeryHelpVisualsController,
  updateBakeryHelpVisualController,
  updateBakeryHelpVisualStatusController,
} from '../controllers/helps-section.controller';

/**
 * Admin router for the How UpWON Helps diagrams. The copy above them is served
 * by the shared section-copy router under ('bakery', 'helps').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllBakeryHelpVisualsController));
router.post('/', create, asyncHandler(createBakeryHelpVisualController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderBakeryHelpVisualsController));
router.get('/:id', read, asyncHandler(getBakeryHelpVisualByIdController));
router.put('/:id', update, asyncHandler(updateBakeryHelpVisualController));
router.put('/:id/status', update, asyncHandler(updateBakeryHelpVisualStatusController));
router.delete('/:id', destroy, asyncHandler(deleteBakeryHelpVisualController));

export default router;

/** The website-facing read: the copy and the live diagram. */
export const publicBakeryHelpsSectionRouter = Router();

publicBakeryHelpsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBakeryHelpsSectionController),
);
