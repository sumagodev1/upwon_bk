// src/modules/clients-page/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  createClientsHeroSlideController,
  deleteClientsHeroSlideController,
  getAllClientsHeroSlidesController,
  getClientsHeroSlideByIdController,
  getPublicClientsHeroSectionController,
  reorderClientsHeroSlidesController,
  updateClientsHeroSlideController,
  updateClientsHeroSlideStatusController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router. Mounted under the authenticated API at
 * /clients-page/hero-section, so every handler here already has req.admin.
 * The same surface as /home-page/hero-section, route for route.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.CLIENTS_PAGE_READ),
  asyncHandler(getAllClientsHeroSlidesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.CLIENTS_PAGE_CREATE),
  asyncHandler(createClientsHeroSlideController),
);

// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.CLIENTS_PAGE_UPDATE),
  asyncHandler(reorderClientsHeroSlidesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CLIENTS_PAGE_READ),
  asyncHandler(getClientsHeroSlideByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.CLIENTS_PAGE_UPDATE),
  asyncHandler(updateClientsHeroSlideController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.CLIENTS_PAGE_UPDATE),
  asyncHandler(updateClientsHeroSlideStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.CLIENTS_PAGE_DELETE),
  asyncHandler(deleteClientsHeroSlideController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, ACTIVE rows
 * only, in the narrowed PublicClientsHeroSlide shape - the same reasoning as
 * the home hero's public router in home-page/routes/hero-section.routes.ts.
 */
export const publicClientsHeroSectionRouter = Router();

publicClientsHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicClientsHeroSectionController),
);
