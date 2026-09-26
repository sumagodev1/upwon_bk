// src/modules/about-page/routes/numbers-section.routes.ts

import { Router } from 'express';
import {
  getAboutNumbersSectionController,
  getPublicAboutNumbersSectionController,
  replaceAboutNumbersSectionController,
} from '../controllers/numbers-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /about-page/numbers-section behind authentication. The
 * section's COPY only; the stat cards are /about-page/number-stats - see the team
 * section's router for why the two are separate resources on one screen.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_READ),
  asyncHandler(getAboutNumbersSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(replaceAboutNumbersSectionController),
);

export default router;

/**
 * Public router: read-only, the copy with its ACTIVE stat cards embedded in
 * display order - one route for both halves, as the page renders them.
 */
export const publicAboutNumbersSectionRouter = Router();

publicAboutNumbersSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicAboutNumbersSectionController),
);
