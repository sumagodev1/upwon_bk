// src/modules/blog/routes/categories.routes.ts

import { Router } from 'express';
import {
  createBlogCategoryController,
  deleteBlogCategoryController,
  getAllBlogCategoriesController,
  getBlogCategoryByIdController,
  reorderBlogCategoriesController,
  updateBlogCategoryController,
  updateBlogCategoryStatusController,
} from '../controllers/categories.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /blog/categories behind authentication.
 *
 * The topic chips, as an ordered child list on the About page's pattern. No
 * public router of its own: the chips are served inside /public/blog/posts,
 * with the counts that only make sense next to the posts they count.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.BLOG_READ),
  asyncHandler(getAllBlogCategoriesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(createBlogCategoryController),
);

// Declared before '/:id', or 'reorder' would be parsed as a category id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(reorderBlogCategoriesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.BLOG_READ),
  asyncHandler(getBlogCategoryByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(updateBlogCategoryController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(updateBlogCategoryStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.BLOG_UPDATE),
  asyncHandler(deleteBlogCategoryController),
);

export default router;
