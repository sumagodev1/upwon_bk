// src/modules/knowledgebase/routes/articles.routes.ts

import { Router } from 'express';
import {
  createKbArticleController,
  deleteKbArticleController,
  getAllKbArticlesController,
  getKbArticleByIdController,
  updateKbArticleController,
  updateKbArticleStatusController,
} from '../controllers/articles.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /knowledgebase/articles behind authentication.
 *
 * No reorder route: a category page lists its articles by their "Updated"
 * date, newest first. Moving an article means changing its date.
 *
 * No public router of its own: an article is read under its category, at
 * /public/knowledgebase/categories/:slug/articles/:articleSlug - see
 * categories.routes.ts.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_READ),
  asyncHandler(getAllKbArticlesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(createKbArticleController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_READ),
  asyncHandler(getKbArticleByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(updateKbArticleController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(updateKbArticleStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(deleteKbArticleController),
);

export default router;
