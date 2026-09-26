// src/modules/insider-page/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  createInsiderHeroSlideController,
  deleteInsiderHeroSlideController,
  getAllInsiderHeroSlidesController,
  getInsiderHeroSlideByIdController,
  getPublicInsiderHeroSectionController,
  reorderInsiderHeroSlidesController,
  updateInsiderHeroSlideController,
  updateInsiderHeroSlideStatusController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router. Mounted under the authenticated API at
 * /insider-page/hero-section, so every handler here already has req.admin.
 * The same surface as /home-page/hero-section, route for route.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.INSIDER_PAGE_READ),
  asyncHandler(getAllInsiderHeroSlidesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.INSIDER_PAGE_CREATE),
  asyncHandler(createInsiderHeroSlideController),
);

// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(reorderInsiderHeroSlidesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.INSIDER_PAGE_READ),
  asyncHandler(getInsiderHeroSlideByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(updateInsiderHeroSlideController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(updateInsiderHeroSlideStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.INSIDER_PAGE_DELETE),
  asyncHandler(deleteInsiderHeroSlideController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, ACTIVE rows
 * only, in the narrowed PublicInsiderHeroSlide shape - the same reasoning as
 * the home hero's public router in home-page/routes/hero-section.routes.ts.
 */
export const publicInsiderHeroSectionRouter = Router();

publicInsiderHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicInsiderHeroSectionController),
);
