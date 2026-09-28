// src/modules/industry-pages/beverage-page/routes/hero-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createBeverageHeroSlideController,
  deleteBeverageHeroSlideController,
  getAllBeverageHeroSlidesController,
  getBeverageHeroSlideByIdController,
  getPublicBeverageHeroSlidesController,
  reorderBeverageHeroSlidesController,
  updateBeverageHeroSlideController,
  updateBeverageHeroSlideStatusController,
} from '../controllers/hero-section.controller';

/**
 * Admin router for the Beverages & Juices hero slider.
 *
 * Same surface as the product pages' heroes deliberately: a list section gets
 * the seven routes a list needs. There is no section copy - each slide carries
 * its own eyebrow, headline and subhead.
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
router.get('/', read, asyncHandler(getAllBeverageHeroSlidesController));
router.post('/', create, asyncHandler(createBeverageHeroSlideController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderBeverageHeroSlidesController));
router.get('/:id', read, asyncHandler(getBeverageHeroSlideByIdController));
router.put('/:id', update, asyncHandler(updateBeverageHeroSlideController));
router.put('/:id/status', update, asyncHandler(updateBeverageHeroSlideStatusController));
router.delete('/:id', destroy, asyncHandler(deleteBeverageHeroSlideController));

export default router;

/** The website-facing read, mounted outside the authentication middleware. */
export const publicBeverageHeroSectionRouter = Router();

publicBeverageHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicBeverageHeroSlidesController),
);
