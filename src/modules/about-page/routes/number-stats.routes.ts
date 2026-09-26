// src/modules/about-page/routes/number-stats.routes.ts

import { Router } from 'express';
import {
  createAboutNumberStatController,
  deleteAboutNumberStatController,
  getAboutNumberStatByIdController,
  getAllAboutNumberStatsController,
  reorderAboutNumberStatsController,
  updateAboutNumberStatController,
  updateAboutNumberStatStatusController,
} from '../controllers/number-stats.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /about-page/number-stats behind authentication.
 *
 * The stat cards under the Number section's headline: created, edited, published,
 * reordered and deleted, on the same shape as the team members.
 *
 * Guarded by about_page.read and about_page.update, with no separate create or
 * delete key - see the team members router and ABOUT_PAGE_UPDATE in
 * config/constants.
 *
 * There is no public router here. The cards are served inside
 * /public/about-page/numbers-section, which is how the page renders them.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_READ),
  asyncHandler(getAllAboutNumberStatsController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(createAboutNumberStatController),
);

// Declared before '/:id', or 'reorder' would be parsed as a stat id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(reorderAboutNumberStatsController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.ABOUT_PAGE_READ),
  asyncHandler(getAboutNumberStatByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(updateAboutNumberStatController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(updateAboutNumberStatStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(deleteAboutNumberStatController),
);

export default router;
