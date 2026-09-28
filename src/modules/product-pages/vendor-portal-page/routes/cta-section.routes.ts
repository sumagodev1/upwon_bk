// src/modules/product-pages/vendor-portal-page/routes/cta-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  getPublicVmsCtaSectionController,
  getVmsCtaSectionController,
  getVmsIconsController,
  upsertVmsCtaSectionController,
} from '../controllers/cta-section.controller';

/**
 * Admin router for the closing band.
 *
 * A singleton, so a GET and a PUT rather than the seven routes a list needs -
 * and no trust strip under it, unlike the WMS band.
 *
 * '/icons' is mounted here because this is the page's fixed section and the
 * allowlist is per page, not per section: the proof strip's metric tiles read
 * it from the same place.
 *
 * The copy that heads the band is not here - it is served by the shared
 * section-copy router under ('vms', 'cta').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);

const router = Router();

/*
 * Declared before '/' would matter only for a param route, but keeping the
 * allowlist first matches every other page's router and reads as a list of
 * the page's fixed endpoints.
 */
router.get('/icons', read, asyncHandler(getVmsIconsController));
router.get('/', read, asyncHandler(getVmsCtaSectionController));
router.put('/', update, asyncHandler(upsertVmsCtaSectionController));

export default router;

/** The website-facing read: the copy and the band, in one call. */
export const publicVmsCtaSectionRouter = Router();

publicVmsCtaSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicVmsCtaSectionController),
);
