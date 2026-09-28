// src/modules/industry-pages/beverage-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBeveragePlatformWorkflowController,
  deleteBeveragePlatformWorkflowController,
  getAllBeveragePlatformWorkflowsController,
  getBeverageIconsController,
  getBeveragePlatformPanelController,
  getBeveragePlatformWorkflowByIdController,
  getPublicBeveragePlatformSectionController,
  reorderBeveragePlatformWorkflowsController,
  updateBeveragePlatformPanelController,
  updateBeveragePlatformWorkflowController,
  updateBeveragePlatformWorkflowStatusController,
} from '../controllers/platform-section.controller';

/**
 * Admin router for the connected platform section.
 *
 * Two groups under one mount: the panel, read and replaced as one record, and
 * the workflows, a list. The copy is served by the shared section-copy router
 * under ('beverage', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/icons', read, asyncHandler(getBeverageIconsController));

// The panel.
router.get('/panel', read, asyncHandler(getBeveragePlatformPanelController));
router.put('/panel', update, asyncHandler(updateBeveragePlatformPanelController));

// The workflows.
router.get('/workflows', read, asyncHandler(getAllBeveragePlatformWorkflowsController));
router.post('/workflows', create, asyncHandler(createBeveragePlatformWorkflowController));
/*
 * Declared before '/workflows/:id' - Express matches in registration order, so
 * the reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/workflows/reorder',
  update,
  asyncHandler(reorderBeveragePlatformWorkflowsController),
);
router.get('/workflows/:id', read, asyncHandler(getBeveragePlatformWorkflowByIdController));
router.put('/workflows/:id', update, asyncHandler(updateBeveragePlatformWorkflowController));
router.put(
  '/workflows/:id/status',
  update,
  asyncHandler(updateBeveragePlatformWorkflowStatusController),
);
router.delete(
  '/workflows/:id',
  destroy,
  asyncHandler(deleteBeveragePlatformWorkflowController),
);

export default router;

/** The website-facing read: the copy, the panel and the workflows, in one call. */
export const publicBeveragePlatformSectionRouter = Router();

publicBeveragePlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBeveragePlatformSectionController),
);
