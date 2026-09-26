// src/modules/blog/routes/posts.routes.ts

import { Router } from 'express';
import {
  createBlogPostController,
  deleteBlogPostController,
  getAllBlogPostsController,
  getBlogPostByIdController,
  getPublicBlogIndexController,
  getPublicBlogPostController,
  updateBlogPostController,
  updateBlogPostStatusController,
} from '../controllers/posts.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /blog/posts behind authentication.
 *
 * No reorder route: posts are ordered by their publish date, newest first, and
 * the newest is the featured card. Moving a post means changing its date.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.BLOG_READ),
  asyncHandler(getAllBlogPostsController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(createBlogPostController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.BLOG_READ),
  asyncHandler(getBlogPostByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(updateBlogPostController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(updateBlogPostStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(deleteBlogPostController),
);

export default router;

/**
 * Public router: read-only.
 *
 *   GET /          the chips and the grid in one read, always a 200.
 *   GET /:slug     one published article with its related cards, or a 404.
 *
 * The public side addresses a post by its slug - its /blog/<slug> URL - never
 * by id.
 */
export const publicBlogPostsRouter = Router();

publicBlogPostsRouter.get('/', standardRateLimit, asyncHandler(getPublicBlogIndexController));

publicBlogPostsRouter.get(
  '/:slug',
  standardRateLimit,
  asyncHandler(getPublicBlogPostController),
);
