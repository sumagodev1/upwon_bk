// src/modules/contact-page/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  getContactHeroSectionController,
  getPublicContactHeroSectionController,
  replaceContactHeroSectionController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /contact-page/hero-section behind authentication.
 * A singleton, so there is no id, no list, and no create or delete: GET reads
 * it and PUT replaces it (creating it on the first save).
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.CONTACT_PAGE_READ),
  asyncHandler(getContactHeroSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.CONTACT_PAGE_UPDATE),
  asyncHandler(replaceContactHeroSectionController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, in the
 * narrowed PublicContactHeroSection shape - see the home hero's public router
 * for the reasoning.
 */
export const publicContactHeroSectionRouter = Router();

publicContactHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicContactHeroSectionController),
);
