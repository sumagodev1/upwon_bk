// src/modules/home-page/routes/section-copy.routes.ts

import { Router } from 'express';
import {
  getSectionCopyController,
  updateSectionCopyController,
} from '../controllers/section-copy.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router for the shared copy that heads each section of each page.
 *
 * One route pair for every section rather than one per section: the shape is
 * identical, so the page and the section are path parameters checked together
 * against PAGE_SECTION_KEYS. There is no public router - each section's own
 * public endpoint already merges its copy into the block the site renders, so
 * a separate fetch would just be a second round trip for the same page.
 */
const router = Router();

router.get(
  '/:pageKey/:sectionKey',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getSectionCopyController),
);

/*
 * PUT rather than PATCH: the body is the complete copy, and an upsert makes
 * "create" and "update" the same request for a row that is one per section.
 */
router.put(
  '/:pageKey/:sectionKey',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateSectionCopyController),
);

export default router;
