// src/modules/about-page/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  getAboutHeroSectionController,
  getPublicAboutHeroSectionController,
  replaceAboutHeroSectionController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /about-page/hero-section behind authentication.
 * A singleton, so there is no id, no list, and no create or delete: GET reads it
 * and PUT replaces it (creating it on the first save).
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_READ),
  asyncHandler(getAboutHeroSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(replaceAboutHeroSectionController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, in the
 * narrowed PublicAboutHeroSection shape - see the home hero's public router for
 * the reasoning.
 */
export const publicAboutHeroSectionRouter = Router();

publicAboutHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicAboutHeroSectionController),
);
