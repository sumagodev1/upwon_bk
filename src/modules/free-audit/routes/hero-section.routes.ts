// src/modules/free-audit/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  createFreeAuditHeroSlideController,
  deleteFreeAuditHeroSlideController,
  getAllFreeAuditHeroSlidesController,
  getFreeAuditHeroSlideByIdController,
  getPublicFreeAuditHeroSectionController,
  reorderFreeAuditHeroSlidesController,
  updateFreeAuditHeroSlideController,
  updateFreeAuditHeroSlideStatusController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router. Mounted under the authenticated API at
 * /free-audit/hero-section, so every handler here already has req.admin. The
 * same surface as /blog/hero-section, route for route, on this page's two
 * permission keys: free_audit.read for the reads, free_audit.update for every
 * write.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.FREE_AUDIT_READ),
  asyncHandler(getAllFreeAuditHeroSlidesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.FREE_AUDIT_UPDATE),
  asyncHandler(createFreeAuditHeroSlideController),
);

// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.FREE_AUDIT_UPDATE),
  asyncHandler(reorderFreeAuditHeroSlidesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.FREE_AUDIT_READ),
  asyncHandler(getFreeAuditHeroSlideByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.FREE_AUDIT_UPDATE),
  asyncHandler(updateFreeAuditHeroSlideController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.FREE_AUDIT_UPDATE),
  asyncHandler(updateFreeAuditHeroSlideStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.FREE_AUDIT_UPDATE),
  asyncHandler(deleteFreeAuditHeroSlideController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, ACTIVE rows
 * only, in the narrowed PublicFreeAuditHeroSlide shape - the same reasoning as
 * the Blog hero's public router.
 */
export const publicFreeAuditHeroSectionRouter = Router();

publicFreeAuditHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFreeAuditHeroSectionController),
);
