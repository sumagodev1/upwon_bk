// src/modules/industry-pages/engineering-manufacturing-page/routes/hero-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createEngineeringHeroSlideController,
  deleteEngineeringHeroSlideController,
  getAllEngineeringHeroSlidesController,
  getEngineeringHeroSlideByIdController,
  getPublicEngineeringHeroSlidesController,
  reorderEngineeringHeroSlidesController,
  updateEngineeringHeroSlideController,
  updateEngineeringHeroSlideStatusController,
} from '../controllers/hero-section.controller';

/**
 * Admin router for the Engineering & Manufacturing hero slider.
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
router.get('/', read, asyncHandler(getAllEngineeringHeroSlidesController));
router.post('/', create, asyncHandler(createEngineeringHeroSlideController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderEngineeringHeroSlidesController));
router.get('/:id', read, asyncHandler(getEngineeringHeroSlideByIdController));
router.put('/:id', update, asyncHandler(updateEngineeringHeroSlideController));
router.put('/:id/status', update, asyncHandler(updateEngineeringHeroSlideStatusController));
router.delete('/:id', destroy, asyncHandler(deleteEngineeringHeroSlideController));

export default router;

/** The website-facing read, mounted outside the authentication middleware. */
export const publicEngineeringHeroSectionRouter = Router();

publicEngineeringHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicEngineeringHeroSlidesController),
);
