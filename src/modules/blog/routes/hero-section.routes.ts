// src/modules/blog/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  createBlogHeroSlideController,
  deleteBlogHeroSlideController,
  getAllBlogHeroSlidesController,
  getBlogHeroSlideByIdController,
  getPublicBlogHeroSectionController,
  reorderBlogHeroSlidesController,
  updateBlogHeroSlideController,
  updateBlogHeroSlideStatusController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router. Mounted under the authenticated API at /blog/hero-section, so
 * every handler here already has req.admin. The same surface as
 * /insider-page/hero-section, route for route, on the blog's two permission
 * keys: blog.read for the reads, blog.update for every write.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.BLOG_READ),
  asyncHandler(getAllBlogHeroSlidesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(createBlogHeroSlideController),
);

// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(reorderBlogHeroSlidesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.BLOG_READ),
  asyncHandler(getBlogHeroSlideByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(updateBlogHeroSlideController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(updateBlogHeroSlideStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(deleteBlogHeroSlideController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, ACTIVE rows
 * only, in the narrowed PublicBlogHeroSlide shape - the same reasoning as the
 * Insider hero's public router.
 */
export const publicBlogHeroSectionRouter = Router();

publicBlogHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBlogHeroSectionController),
);
