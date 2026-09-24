// src/modules/home-page/routes/integrations-section.routes.ts

import { Router } from 'express';
import {
  createIntegrationsEntryController,
  deleteIntegrationsEntryController,
  getAllIntegrationsEntriesController,
  getIntegrationsEntryByIdController,
  getPublicIntegrationsSectionController,
  reorderIntegrationsEntriesController,
  updateIntegrationsEntryController,
  updateIntegrationsEntryStatusController,
} from '../controllers/integrations-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router for the platform integrations section.
 *
 * Deliberately the same surface as the other home page sections: a list of
 * entries with the same lifecycle gets the same routes rather than a shape of
 * its own to learn.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getAllIntegrationsEntriesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_CREATE),
  asyncHandler(createIntegrationsEntryController),
);

/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(reorderIntegrationsEntriesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getIntegrationsEntryByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateIntegrationsEntryController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateIntegrationsEntryStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_DELETE),
  asyncHandler(deleteIntegrationsEntryController),
);

export default router;

/**
 * Public router, mounted outside the authentication middleware.
 *
 * One endpoint returning the assembled section, not the rows: the site renders
 * one heading beside one sphere, and folding the logos back into that shape is
 * the server's job rather than the browser's.
 */
export const publicIntegrationsSectionRouter = Router();

publicIntegrationsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicIntegrationsSectionController),
);
