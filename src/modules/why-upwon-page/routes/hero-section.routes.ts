// src/modules/why-upwon-page/routes/hero-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  createWhyUpwonHeroSlideController,
  deleteWhyUpwonHeroSlideController,
  getAllWhyUpwonHeroSlidesController,
  getPublicWhyUpwonHeroSectionController,
  getWhyUpwonHeroSlideByIdController,
  reorderWhyUpwonHeroSlidesController,
  updateWhyUpwonHeroSlideController,
  updateWhyUpwonHeroSlideStatusController,
} from '../controllers/hero-section.controller';

/**
 * Admin router for the hero slider.
 *
 * The seven routes a list needs, the same as every other hero in the CMS. It
 * was a GET and a PUT before 082, when the hero was a single record.
 *
 * Unlike this page's other sections the hero has no shared copy of its own:
 * each slide carries its own eyebrow, headline and subhead, which is why
 * ('why-upwon', 'hero') no longer exists in page_section_copy.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllWhyUpwonHeroSlidesController));
router.post('/', create, asyncHandler(createWhyUpwonHeroSlideController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderWhyUpwonHeroSlidesController));
router.get('/:id', read, asyncHandler(getWhyUpwonHeroSlideByIdController));
router.put('/:id', update, asyncHandler(updateWhyUpwonHeroSlideController));
router.put('/:id/status', update, asyncHandler(updateWhyUpwonHeroSlideStatusController));
router.delete('/:id', destroy, asyncHandler(deleteWhyUpwonHeroSlideController));

export default router;

/** The website-facing read: the published slides, in order. */
export const publicWhyUpwonHeroSectionRouter = Router();

publicWhyUpwonHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWhyUpwonHeroSectionController),
);
