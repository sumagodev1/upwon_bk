// src/modules/home-page/routes/values-section.routes.ts

import { Router } from 'express';
import {
  createValuesEntryController,
  deleteValuesEntryController,
  getAllValuesEntriesController,
  getPublicValuesSectionController,
  getValuesEntryByIdController,
  reorderValuesEntriesController,
  updateValuesEntryController,
  updateValuesEntryStatusController,
} from '../controllers/values-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router for the values and work culture section.
 *
 * Deliberately the same surface as the other home page sections: a list of
 * entries with the same lifecycle gets the same routes rather than a shape of
 * its own to learn.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getAllValuesEntriesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_CREATE),
  asyncHandler(createValuesEntryController),
);

/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(reorderValuesEntriesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getValuesEntryByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateValuesEntryController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateValuesEntryStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_DELETE),
  asyncHandler(deleteValuesEntryController),
);

export default router;

/**
 * Public router, mounted outside the authentication middleware.
 *
 * One endpoint returning the assembled section, not the rows: the site renders
 * one heading above a grid, and folding the cards back into that shape is the
 * server's job rather than the browser's.
 */
export const publicValuesSectionRouter = Router();

publicValuesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicValuesSectionController),
);
