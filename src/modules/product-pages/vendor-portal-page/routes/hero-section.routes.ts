// src/modules/product-pages/vendor-portal-page/routes/hero-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createVmsHeroSlideController,
  deleteVmsHeroSlideController,
  getAllVmsHeroSlidesController,
  getVmsHeroSlideByIdController,
  getPublicVmsHeroSlidesController,
  reorderVmsHeroSlidesController,
  updateVmsHeroSlideController,
  updateVmsHeroSlideStatusController,
} from '../controllers/hero-section.controller';

/**
 * Admin router for the Vendor Portal hero slider.
 *
 * Same surface as the home page's sections deliberately: a list section gets
 * the seven routes a list needs.
 *
 * Unlike every other section on this page, the hero has no shared copy of its
 * own: each slide carries its own eyebrow, headline and subhead, which is why
 * there is no ('vms', 'hero') entry in page_section_copy.
 *
 * Permissions reuse the home_page keys rather than adding a parallel set. They
 * already mean "may edit marketing page content", which is exactly the access
 * this needs, and splitting them would mean a permission migration every time a
 * page is added.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllVmsHeroSlidesController));
router.post('/', create, asyncHandler(createVmsHeroSlideController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderVmsHeroSlidesController));
router.get('/:id', read, asyncHandler(getVmsHeroSlideByIdController));
router.put('/:id', update, asyncHandler(updateVmsHeroSlideController));
router.put('/:id/status', update, asyncHandler(updateVmsHeroSlideStatusController));
router.delete('/:id', destroy, asyncHandler(deleteVmsHeroSlideController));

export default router;

/** The website-facing read, mounted outside the authentication middleware. */
export const publicVmsHeroSectionRouter = Router();

publicVmsHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicVmsHeroSlidesController),
);
