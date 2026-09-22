// src/modules/home-page/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  createHeroSlideController,
  deleteHeroSlideController,
  getAllHeroSlidesController,
  getHeroSlideByIdController,
  getPublicHeroSectionController,
  reorderHeroSlidesController,
  updateHeroSlideController,
  updateHeroSlideStatusController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router. Mounted under the authenticated API at
 * /home-page/hero-section, so every handler here already has req.admin.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getAllHeroSlidesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.HOME_PAGE_CREATE),
  asyncHandler(createHeroSlideController),
);

/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(reorderHeroSlidesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_READ),
  asyncHandler(getHeroSlideByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateHeroSlideController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.HOME_PAGE_UPDATE),
  asyncHandler(updateHeroSlideStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.HOME_PAGE_DELETE),
  asyncHandler(deleteHeroSlideController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API.
 *
 * The marketing site is an anonymous browser client: it holds no admin token and
 * cannot be trusted with an API key, since anything shipped to a browser is
 * public. So published hero content is served unauthenticated - it is content
 * that is, by definition, already public the moment it renders on the homepage.
 *
 * What keeps that safe is the narrow surface: read-only, ACTIVE rows only, and
 * the PublicHeroSlide shape, which carries no ids, ordering, timestamps, or
 * authorship. Rate limited on top of the global limiter because this is the one
 * route reachable without credentials.
 */
export const publicHeroSectionRouter = Router();

publicHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicHeroSectionController),
);
