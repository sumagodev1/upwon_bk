// src/modules/home-page/routes/industries-section.routes.ts

import { Router } from 'express';
import {
  createIndustriesEntryController,
  deleteIndustriesEntryController,
  getAllIndustriesEntriesController,
  getIndustriesEntryByIdController,
  getPublicIndustriesSectionController,
  reorderIndustriesEntriesController,
  updateIndustriesEntryController,
  updateIndustriesEntryStatusController,
} from '../controllers/industries-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router for the industries video intro.
 *
 * Deliberately the same surface as the hero and trust sections: a list of
 * entries with the same lifecycle gets the same routes rather than a shape of
 * its own to learn.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getAllIndustriesEntriesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_CREATE),
  asyncHandler(createIndustriesEntryController),
);

/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(reorderIndustriesEntriesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getIndustriesEntryByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateIndustriesEntryController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateIndustriesEntryStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_DELETE),
  asyncHandler(deleteIndustriesEntryController),
);

export default router;

/**
 * Public router, mounted outside the authentication middleware.
 *
 * Same reasoning as the other sections': this is content that is public the
 * moment it renders, and the marketing site holds no credentials.
 */
export const publicIndustriesSectionRouter = Router();

publicIndustriesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicIndustriesSectionController),
);
