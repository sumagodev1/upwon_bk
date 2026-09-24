// src/modules/product-pages/fms-page/routes/hero-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmsHeroSlideController,
  deleteFmsHeroSlideController,
  getAllFmsHeroSlidesController,
  getFmsHeroSlideByIdController,
  getPublicFmsHeroSlidesController,
  reorderFmsHeroSlidesController,
  updateFmsHeroSlideController,
  updateFmsHeroSlideStatusController,
} from '../controllers/hero-section.controller';

/**
 * Admin router for the FMS hero slider.
 *
 * Same surface as the home page's sections deliberately: a list section gets
 * the seven routes a list needs. The copy that heads each section is not here -
 * it is served by the shared section-copy router under ('erp', <section>).
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
router.get('/', read, asyncHandler(getAllFmsHeroSlidesController));
router.post('/', create, asyncHandler(createFmsHeroSlideController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderFmsHeroSlidesController));
router.get('/:id', read, asyncHandler(getFmsHeroSlideByIdController));
router.put('/:id', update, asyncHandler(updateFmsHeroSlideController));
router.put('/:id/status', update, asyncHandler(updateFmsHeroSlideStatusController));
router.delete('/:id', destroy, asyncHandler(deleteFmsHeroSlideController));

export default router;

/** The website-facing read, mounted outside the authentication middleware. */
export const publicFmsHeroSectionRouter = Router();

publicFmsHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmsHeroSlidesController),
);
