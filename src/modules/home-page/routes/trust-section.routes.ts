// src/modules/home-page/routes/trust-section.routes.ts

import { Router } from 'express';
import {
  createTrustEntryController,
  deleteTrustEntryController,
  getAllTrustEntriesController,
  getPublicTrustSectionController,
  getTrustEntryByIdController,
  reorderTrustEntriesController,
  updateTrustEntryController,
  updateTrustEntryStatusController,
} from '../controllers/trust-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router for the trust section, mounted under the authenticated API.
 *
 * Deliberately the same surface as the hero section's: the trust section is a
 * list of entries with the same lifecycle, so it gets the same routes rather
 * than a shape of its own to learn.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getAllTrustEntriesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_CREATE),
  asyncHandler(createTrustEntryController),
);

/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(reorderTrustEntriesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getTrustEntryByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateTrustEntryController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateTrustEntryStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_DELETE),
  asyncHandler(deleteTrustEntryController),
);

export default router;

/**
 * Public router, mounted outside the authentication middleware.
 *
 * One endpoint returning the assembled section, not the entries: the site
 * renders one card, and folding the rows back into that shape is the server's
 * job rather than the browser's.
 */
export const publicTrustSectionRouter = Router();

publicTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicTrustSectionController),
);
