// src/modules/industry-pages/fmcg-page/routes/hero-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmcgHeroSlideController,
  deleteFmcgHeroSlideController,
  getAllFmcgHeroSlidesController,
  getFmcgHeroSlideByIdController,
  getPublicFmcgHeroSlidesController,
  reorderFmcgHeroSlidesController,
  updateFmcgHeroSlideController,
  updateFmcgHeroSlideStatusController,
} from '../controllers/hero-section.controller';

/**
 * Admin router for the FMCG hero slider.
 *
 * Same surface as the home page's sections deliberately: a list section gets
 * the seven routes a list needs. The copy that heads each section is not here -
 * it is served by the shared section-copy router under ('fmcg', <section>).
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
router.get('/', read, asyncHandler(getAllFmcgHeroSlidesController));
router.post('/', create, asyncHandler(createFmcgHeroSlideController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderFmcgHeroSlidesController));
router.get('/:id', read, asyncHandler(getFmcgHeroSlideByIdController));
router.put('/:id', update, asyncHandler(updateFmcgHeroSlideController));
router.put('/:id/status', update, asyncHandler(updateFmcgHeroSlideStatusController));
router.delete('/:id', destroy, asyncHandler(deleteFmcgHeroSlideController));

export default router;

/** The website-facing read, mounted outside the authentication middleware. */
export const publicFmcgHeroSectionRouter = Router();

publicFmcgHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmcgHeroSlidesController),
);
