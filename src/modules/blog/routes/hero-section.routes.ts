// src/modules/blog/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  getBlogHeroSectionController,
  getPublicBlogHeroSectionController,
  replaceBlogHeroSectionController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /blog/hero-section behind authentication. The one
 * hero slide's copy and its two buttons - a singleton, read and replaced whole.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.BLOG_READ),
  asyncHandler(getBlogHeroSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(replaceBlogHeroSectionController),
);

export default router;

/** Public router: read-only. 404 while the hero has never been authored. */
export const publicBlogHeroSectionRouter = Router();

publicBlogHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBlogHeroSectionController),
);
