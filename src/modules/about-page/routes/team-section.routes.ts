// src/modules/about-page/routes/team-section.routes.ts

import { Router } from 'express';
import {
  getAboutTeamSectionController,
  getPublicAboutTeamSectionController,
  replaceAboutTeamSectionController,
} from '../controllers/team-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /about-page/team-section behind authentication. The
 * section's COPY only - its eyebrow, headline and description.
 *
 * The people are /about-page/team-members, a resource of their own, even though
 * the admin panel manages both on one screen: a save of the headline must not be
 * able to reorder or delete anybody, and adding a person must not have to resend
 * the headline.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_READ),
  asyncHandler(getAboutTeamSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(replaceAboutTeamSectionController),
);

export default router;

/**
 * Public router: read-only, the copy with its ACTIVE people embedded in display
 * order.
 *
 * One route for both halves, unlike the admin side. The page renders them as one
 * band, and a second request for the grid would only add a way for the two halves
 * to disagree - and a URL from which the people could be read without the section
 * that frames them.
 */
export const publicAboutTeamSectionRouter = Router();

publicAboutTeamSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicAboutTeamSectionController),
);
