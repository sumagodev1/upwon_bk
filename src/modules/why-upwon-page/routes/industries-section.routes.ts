// src/modules/why-upwon-page/routes/industries-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  createWhyUpwonIndustryController,
  deleteWhyUpwonIndustryController,
  getAllWhyUpwonIndustriesController,
  getPublicWhyUpwonIndustrySectionController,
  getWhyUpwonIndustryByIdController,
  reorderWhyUpwonIndustriesController,
  updateWhyUpwonIndustryController,
  updateWhyUpwonIndustryStatusController,
} from '../controllers/industries-section.controller';

/**
 * Admin router for the industry trust row: the seven routes a list section
 * gets. The copy is served by the shared section-copy router under
 * ('why-upwon', 'industries').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllWhyUpwonIndustriesController));
router.post('/', create, asyncHandler(createWhyUpwonIndustryController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderWhyUpwonIndustriesController));
router.get('/:id', read, asyncHandler(getWhyUpwonIndustryByIdController));
router.put('/:id', update, asyncHandler(updateWhyUpwonIndustryController));
router.put('/:id/status', update, asyncHandler(updateWhyUpwonIndustryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteWhyUpwonIndustryController));

export default router;

/** The website-facing read: the copy and the industries, in one call. */
export const publicWhyUpwonIndustrySectionRouter = Router();

publicWhyUpwonIndustrySectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWhyUpwonIndustrySectionController),
);
