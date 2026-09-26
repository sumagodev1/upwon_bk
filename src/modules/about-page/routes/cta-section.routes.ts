// src/modules/about-page/routes/cta-section.routes.ts

import { Router } from 'express';
import {
  getAboutCtaSectionController,
  getPublicAboutCtaSectionController,
  replaceAboutCtaSectionController,
} from '../controllers/cta-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /about-page/cta-section behind authentication. A
 * singleton: GET reads it and PUT replaces it, creating it on the first save.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_READ),
  asyncHandler(getAboutCtaSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(replaceAboutCtaSectionController),
);

export default router;

/** Public router: read-only, in the narrowed PublicAboutCtaSection shape. */
export const publicAboutCtaSectionRouter = Router();

publicAboutCtaSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicAboutCtaSectionController),
);
