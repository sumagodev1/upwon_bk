// src/modules/insider-page/routes/issues.routes.ts

import { Router } from 'express';
import {
  createInsiderIssueController,
  deleteInsiderIssueController,
  getAllInsiderIssuesController,
  getInsiderIssueByIdController,
  getPublicInsiderIssuesController,
  getPublicInsiderStoryController,
  setCurrentInsiderIssueController,
  updateInsiderIssueController,
  updateInsiderIssueStatusController,
} from '../controllers/issues.controller';
import {
  createInsiderStoryController,
  deleteInsiderStoryController,
  getInsiderStoryByIdController,
  reorderInsiderStoriesController,
  updateInsiderStoryController,
  updateInsiderStoryStatusController,
} from '../controllers/stories.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /insider-page/issues behind authentication. One
 * section, so issues and the stories nested under them share this router:
 * a story is always addressed through its issue.
 */
const router = Router();

// ── issues ────────────────────────────────────────────────────────────────

router.get(
  '/',
  requirePermission(PERMISSIONS.INSIDER_PAGE_READ),
  asyncHandler(getAllInsiderIssuesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.INSIDER_PAGE_CREATE),
  asyncHandler(createInsiderIssueController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.INSIDER_PAGE_READ),
  asyncHandler(getInsiderIssueByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(updateInsiderIssueController),
);

router.put(
  '/:id/current',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(setCurrentInsiderIssueController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(updateInsiderIssueStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.INSIDER_PAGE_DELETE),
  asyncHandler(deleteInsiderIssueController),
);

// ── stories ───────────────────────────────────────────────────────────────

router.post(
  '/:issueId/stories',
  requirePermission(PERMISSIONS.INSIDER_PAGE_CREATE),
  asyncHandler(createInsiderStoryController),
);

// Declared before '/:issueId/stories/:storyId', or 'reorder' would be parsed
// as a story id.
router.put(
  '/:issueId/stories/reorder',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(reorderInsiderStoriesController),
);

router.get(
  '/:issueId/stories/:storyId',
  requirePermission(PERMISSIONS.INSIDER_PAGE_READ),
  asyncHandler(getInsiderStoryByIdController),
);

router.put(
  '/:issueId/stories/:storyId',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(updateInsiderStoryController),
);

router.put(
  '/:issueId/stories/:storyId/status',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(updateInsiderStoryStatusController),
);

router.delete(
  '/:issueId/stories/:storyId',
  requirePermission(PERMISSIONS.INSIDER_PAGE_DELETE),
  asyncHandler(deleteInsiderStoryController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API: the archive and one
 * story page, read-only, ACTIVE content only, in the narrowed public shapes.
 * The reasoning is the home hero's - see home-page/routes/hero-section.routes.ts.
 */
export const publicInsiderIssuesRouter = Router();

publicInsiderIssuesRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicInsiderIssuesController),
);

publicInsiderIssuesRouter.get(
  '/:issueSlug/stories/:storySlug',
  standardRateLimit,
  asyncHandler(getPublicInsiderStoryController),
);
