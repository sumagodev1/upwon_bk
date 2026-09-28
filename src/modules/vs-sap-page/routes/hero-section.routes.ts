// src/modules/vs-sap-page/routes/hero-section.routes.ts

import { Router } from 'express';
import {
  createVsSapHeroSlideController,
  deleteVsSapHeroSlideController,
  getAllVsSapHeroSlidesController,
  getPublicVsSapHeroSectionController,
  getVsSapHeroSlideByIdController,
  reorderVsSapHeroSlidesController,
  updateVsSapHeroSlideController,
  updateVsSapHeroSlideStatusController,
} from '../controllers/hero-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router. Mounted under the authenticated API at
 * /vs-sap-page/hero-section, so every handler here already has req.admin. The
 * same surface as /free-audit/hero-section, route for route, on this page's
 * two permission keys: vs_sap_page.read for the reads, vs_sap_page.update for
 * every write.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_READ),
  asyncHandler(getAllVsSapHeroSlidesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(createVsSapHeroSlideController),
);

// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(reorderVsSapHeroSlidesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_READ),
  asyncHandler(getVsSapHeroSlideByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(updateVsSapHeroSlideController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(updateVsSapHeroSlideStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(deleteVsSapHeroSlideController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API. Read-only, ACTIVE rows
 * only, in the narrowed PublicVsSapHeroSlide shape - the same reasoning as
 * the Free Audit hero's public router.
 */
export const publicVsSapHeroSectionRouter = Router();

publicVsSapHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicVsSapHeroSectionController),
);
