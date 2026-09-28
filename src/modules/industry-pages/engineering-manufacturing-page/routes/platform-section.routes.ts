// src/modules/industry-pages/engineering-manufacturing-page/routes/platform-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createEngineeringPlatformWorkflowController,
  deleteEngineeringPlatformWorkflowController,
  getAllEngineeringPlatformWorkflowsController,
  getEngineeringPlatformPanelController,
  getEngineeringPlatformWorkflowByIdController,
  getPublicEngineeringPlatformSectionController,
  reorderEngineeringPlatformWorkflowsController,
  updateEngineeringPlatformPanelController,
  updateEngineeringPlatformWorkflowController,
  updateEngineeringPlatformWorkflowStatusController,
} from '../controllers/platform-section.controller';
import { getEngineeringIconsController } from '../controllers/trust-section.controller';

/**
 * Admin router for the connected platform section.
 *
 * Two groups under one mount: the centre panel, read and replaced as one
 * record, and the workflows, a list. The copy on the left is served by the
 * shared section-copy router under ('engineering-manufacturing', 'platform').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/icons', read, asyncHandler(getEngineeringIconsController));

// The centre panel.
router.get('/panel', read, asyncHandler(getEngineeringPlatformPanelController));
router.put('/panel', update, asyncHandler(updateEngineeringPlatformPanelController));

// The workflows.
router.get('/workflows', read, asyncHandler(getAllEngineeringPlatformWorkflowsController));
router.post('/workflows', create, asyncHandler(createEngineeringPlatformWorkflowController));
/*
 * Declared before '/workflows/:id' - Express matches in registration order, so
 * the reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/workflows/reorder',
  update,
  asyncHandler(reorderEngineeringPlatformWorkflowsController),
);
router.get('/workflows/:id', read, asyncHandler(getEngineeringPlatformWorkflowByIdController));
router.put('/workflows/:id', update, asyncHandler(updateEngineeringPlatformWorkflowController));
router.put(
  '/workflows/:id/status',
  update,
  asyncHandler(updateEngineeringPlatformWorkflowStatusController),
);
router.delete(
  '/workflows/:id',
  destroy,
  asyncHandler(deleteEngineeringPlatformWorkflowController),
);

export default router;

/** The website-facing read: the copy, the panel and the workflows, in one call. */
export const publicEngineeringPlatformSectionRouter = Router();

publicEngineeringPlatformSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicEngineeringPlatformSectionController),
);
