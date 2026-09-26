// src/modules/product-pages/hreasy-page/routes/lifecycle-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createHreasyLifecycleCardController,
  deleteHreasyLifecycleCardController,
  getAllHreasyLifecycleCardsController,
  getHreasyLifecycleCardByIdController,
  getPublicHreasyLifecycleSectionController,
  reorderHreasyLifecycleCardsController,
  updateHreasyLifecycleCardController,
  updateHreasyLifecycleCardStatusController,
} from '../controllers/lifecycle-section.controller';

/**
 * Admin router for the HREasy capability card grid.
 *
 * The seven routes a list section gets, the same as this page's other lists.
 * The copy that heads the section is not here - it is served by the shared
 * section-copy router under ('hreasy', 'lifecycle').
 *
 * Permissions reuse the home_page keys rather than adding a parallel set.
 * They already mean "may edit marketing page content", which is exactly the
 * access this needs.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllHreasyLifecycleCardsController));
router.post('/', create, asyncHandler(createHreasyLifecycleCardController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderHreasyLifecycleCardsController));
router.get('/:id', read, asyncHandler(getHreasyLifecycleCardByIdController));
router.put('/:id', update, asyncHandler(updateHreasyLifecycleCardController));
router.put('/:id/status', update, asyncHandler(updateHreasyLifecycleCardStatusController));
router.delete('/:id', destroy, asyncHandler(deleteHreasyLifecycleCardController));

export default router;

/** The website-facing read, mounted outside the authentication middleware. */
export const publicHreasyLifecycleSectionRouter = Router();

publicHreasyLifecycleSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicHreasyLifecycleSectionController),
);
