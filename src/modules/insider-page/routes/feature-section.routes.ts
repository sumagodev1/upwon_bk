// src/modules/insider-page/routes/feature-section.routes.ts

import { Router } from 'express';
import {
  getInsiderFeatureSectionController,
  getPublicInsiderFeatureSectionController,
  replaceInsiderFeatureSectionController,
} from '../controllers/feature-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /insider-page/feature-section behind
 * authentication. A singleton, so there is no id, no list, and no create or
 * delete: GET reads it and PUT replaces it (creating it on the first save).
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.INSIDER_PAGE_READ),
  asyncHandler(getInsiderFeatureSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.INSIDER_PAGE_UPDATE),
  asyncHandler(replaceInsiderFeatureSectionController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, in the
 * narrowed PublicInsiderFeatureSection shape - see the home hero's public
 * router for the reasoning.
 */
export const publicInsiderFeatureSectionRouter = Router();

publicInsiderFeatureSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicInsiderFeatureSectionController),
);
