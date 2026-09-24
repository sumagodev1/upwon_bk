// src/modules/home-page/routes/cta-section.routes.ts

import { Router } from 'express';
import {
  getCtaSectionController,
  getPublicCtaSectionController,
  updateCtaSectionController,
} from '../controllers/cta-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router for the report-download band.
 *
 * Two routes rather than the seven the list sections get: the band is one
 * record, so there is nothing to create, delete, reorder or publish - only to
 * read and to replace.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getCtaSectionController),
);

/*
 * PUT rather than PATCH: the body is the complete band, and an upsert makes
 * "create" and "update" the same request for a row that is one per site.
 */
router.put(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateCtaSectionController),
);

export default router;

/** Public router, mounted outside the authentication middleware. */
export const publicCtaSectionRouter = Router();

publicCtaSectionRouter.get('/', standardRateLimit, asyncHandler(getPublicCtaSectionController));
