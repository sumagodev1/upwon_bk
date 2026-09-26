// src/modules/knowledgebase/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  createKbHeroSlideController,
  deleteKbHeroSlideController,
  getAllKbHeroSlidesController,
  getKbHeroSlideByIdController,
  getPublicKbHeroSectionController,
  reorderKbHeroSlidesController,
  updateKbHeroSlideController,
  updateKbHeroSlideStatusController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router. Mounted under the authenticated API at
 * /knowledgebase/hero-section, so every handler here already has req.admin.
 * The same surface as /blog/hero-section, route for route, on this page's two
 * permission keys: knowledgebase.read for the reads, knowledgebase.update for
 * every write.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_READ),
  asyncHandler(getAllKbHeroSlidesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(createKbHeroSlideController),
);

// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(reorderKbHeroSlidesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_READ),
  asyncHandler(getKbHeroSlideByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(updateKbHeroSlideController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(updateKbHeroSlideStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.KNOWLEDGEBASE_UPDATE),
  asyncHandler(deleteKbHeroSlideController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, ACTIVE rows
 * only, in the narrowed PublicKbHeroSlide shape - the same reasoning as the
 * Blog hero's public router.
 */
export const publicKbHeroSectionRouter = Router();

publicKbHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicKbHeroSectionController),
);
