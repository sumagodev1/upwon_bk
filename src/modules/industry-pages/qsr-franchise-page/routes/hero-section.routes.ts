// src/modules/industry-pages/qsr-franchise-page/routes/hero-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createQsrFranchiseHeroSlideController,
  deleteQsrFranchiseHeroSlideController,
  getAllQsrFranchiseHeroSlidesController,
  getQsrFranchiseHeroSlideByIdController,
  getPublicQsrFranchiseHeroSlidesController,
  reorderQsrFranchiseHeroSlidesController,
  updateQsrFranchiseHeroSlideController,
  updateQsrFranchiseHeroSlideStatusController,
} from '../controllers/hero-section.controller';

/**
 * Admin router for the QSR & Franchise F&B hero slider.
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
router.get('/', read, asyncHandler(getAllQsrFranchiseHeroSlidesController));
router.post('/', create, asyncHandler(createQsrFranchiseHeroSlideController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderQsrFranchiseHeroSlidesController));
router.get('/:id', read, asyncHandler(getQsrFranchiseHeroSlideByIdController));
router.put('/:id', update, asyncHandler(updateQsrFranchiseHeroSlideController));
router.put('/:id/status', update, asyncHandler(updateQsrFranchiseHeroSlideStatusController));
router.delete('/:id', destroy, asyncHandler(deleteQsrFranchiseHeroSlideController));

export default router;

/** The website-facing read, mounted outside the authentication middleware. */
export const publicQsrFranchiseHeroSectionRouter = Router();

publicQsrFranchiseHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicQsrFranchiseHeroSlidesController),
);
