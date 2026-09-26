// src/modules/knowledgebase/routes/categories.routes.ts

import { Router } from 'express';
import {
  getPublicKbArticleController,
  getPublicKbCategoryPageController,
} from '../controllers/articles.controller';
import {
  createKbCategoryController,
  deleteKbCategoryController,
  getAllKbCategoriesController,
  getKbCategoryByIdController,
  getPublicKbCategoriesController,
  reorderKbCategoriesController,
  updateKbCategoryController,
  updateKbCategoryStatusController,
} from '../controllers/categories.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /knowledgebase/categories behind authentication.
 *
 * The hub's category cards, as an ordered child list on the Blog categories'
 * pattern, on the knowledgebase's two permission keys.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_READ),
  asyncHandler(getAllKbCategoriesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(createKbCategoryController),
);

// Declared before '/:id', or 'reorder' would be parsed as a category id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(reorderKbCategoriesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_READ),
  asyncHandler(getKbCategoryByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(updateKbCategoryController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(updateKbCategoryStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(deleteKbCategoryController),
);

export default router;

/**
 * Public router: read-only, and shaped like the site's own URLs, so each page
 * is one read.
 *
 *   GET /                              the hub's cards, always a 200.
 *   GET /:slug                         one category's page, or a 404.
 *   GET /:slug/articles/:articleSlug   one article in that category, or a 404.
 *
 * The public side addresses a category and an article by their slugs - their
 * /knowledgebase/<category>/<article> URL - never by id. The article route
 * sits under its category because the category is part of the article's
 * address: an article answers only under the category it is filed under.
 */
export const publicKbCategoriesRouter = Router();

publicKbCategoriesRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicKbCategoriesController),
);

publicKbCategoriesRouter.get(
  '/:slug',
  standardRateLimit,
  asyncHandler(getPublicKbCategoryPageController),
);

publicKbCategoriesRouter.get(
  '/:slug/articles/:articleSlug',
  standardRateLimit,
  asyncHandler(getPublicKbArticleController),
);
