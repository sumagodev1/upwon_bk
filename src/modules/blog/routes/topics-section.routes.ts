// src/modules/blog/routes/topics-section.routes.ts

import { Router } from 'express';
import {
  getBlogTopicsSectionController,
  getPublicBlogTopicsSectionController,
  replaceBlogTopicsSectionController,
} from '../controllers/topics-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /blog/topics-section behind authentication. The
 * "Insights by Topic" intro's COPY only - its eyebrow, headline and
 * description.
 *
 * The chips under it are /blog/categories, a resource of their own, even
 * though the page renders them as one band: a save of the headline must not be
 * able to reorder or delete a category.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.BLOG_READ),
  asyncHandler(getBlogTopicsSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(replaceBlogTopicsSectionController),
);

export default router;

/** Public router: read-only. 404 while the intro has never been authored. */
export const publicBlogTopicsSectionRouter = Router();

publicBlogTopicsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBlogTopicsSectionController),
);
