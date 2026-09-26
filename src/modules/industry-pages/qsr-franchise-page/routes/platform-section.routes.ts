// src/modules/industry-pages/qsr-franchise-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createQsrFranchisePlatformWorkflowController,
  deleteQsrFranchisePlatformWorkflowController,
  getAllQsrFranchisePlatformWorkflowsController,
  getQsrFranchiseIconsController,
  getQsrFranchisePlatformPanelController,
  getQsrFranchisePlatformWorkflowByIdController,
  getPublicQsrFranchisePlatformSectionController,
  reorderQsrFranchisePlatformWorkflowsController,
  updateQsrFranchisePlatformPanelController,
  updateQsrFranchisePlatformWorkflowController,
  updateQsrFranchisePlatformWorkflowStatusController,
} from '../controllers/platform-section.controller';

/**
 * Admin router for the connected platform section.
 *
 * Two groups under one mount: the panel, read and replaced as one record, and
 * the workflows, a list. The copy is served by the shared section-copy router
 * under ('qsr-franchise', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/icons', read, asyncHandler(getQsrFranchiseIconsController));

// The panel.
router.get('/panel', read, asyncHandler(getQsrFranchisePlatformPanelController));
router.put('/panel', update, asyncHandler(updateQsrFranchisePlatformPanelController));

// The workflows.
router.get('/workflows', read, asyncHandler(getAllQsrFranchisePlatformWorkflowsController));
router.post('/workflows', create, asyncHandler(createQsrFranchisePlatformWorkflowController));
/*
 * Declared before '/workflows/:id' - Express matches in registration order, so
 * the reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/workflows/reorder',
  update,
  asyncHandler(reorderQsrFranchisePlatformWorkflowsController),
);
router.get('/workflows/:id', read, asyncHandler(getQsrFranchisePlatformWorkflowByIdController));
router.put('/workflows/:id', update, asyncHandler(updateQsrFranchisePlatformWorkflowController));
router.put(
  '/workflows/:id/status',
  update,
  asyncHandler(updateQsrFranchisePlatformWorkflowStatusController),
);
router.delete(
  '/workflows/:id',
  destroy,
  asyncHandler(deleteQsrFranchisePlatformWorkflowController),
);

export default router;

/** The website-facing read: the copy, the panel and the workflows, in one call. */
export const publicQsrFranchisePlatformSectionRouter = Router();

publicQsrFranchisePlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicQsrFranchisePlatformSectionController),
);
