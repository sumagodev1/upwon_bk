// src/modules/product-pages/fms-page/routes/franchise-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  benefitControllers,
  createFmsFranchiseCategoryController,
  deleteFmsFranchiseCategoryController,
  getAllFmsFranchiseCategoriesController,
  getFmsFranchiseCategoryByIdController,
  getPublicFmsFranchiseSectionController,
  reorderFmsFranchiseCategoriesController,
  stepControllers,
  updateFmsFranchiseCategoryController,
  updateFmsFranchiseCategoryStatusController,
} from '../controllers/franchise-section.controller';

/**
 * Admin router for the franchise category map.
 *
 * Steps and benefits are nested under their category because they have no
 * meaning apart from it - the path says whose they are, so no request can
 * orphan one, and the two lists cannot be confused for each other.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

/*
 * 'categories/reorder' is declared before 'categories/:id' - Express matches in
 * registration order, so the reverse would parse it as an id and fail UUID
 * validation. The same holds for each child list's own reorder below.
 */
router.get('/categories', read, asyncHandler(getAllFmsFranchiseCategoriesController));
router.post('/categories', create, asyncHandler(createFmsFranchiseCategoryController));
router.put(
  '/categories/reorder',
  update,
  asyncHandler(reorderFmsFranchiseCategoriesController),
);
router.get('/categories/:id', read, asyncHandler(getFmsFranchiseCategoryByIdController));
router.put('/categories/:id', update, asyncHandler(updateFmsFranchiseCategoryController));
router.put(
  '/categories/:id/status',
  update,
  asyncHandler(updateFmsFranchiseCategoryStatusController),
);
router.delete('/categories/:id', destroy, asyncHandler(deleteFmsFranchiseCategoryController));

/** The flow and the strip take the same seven routes under different segments. */
const mountEntries = (
  segment: 'steps' | 'benefits',
  handlers: typeof stepControllers,
): void => {
  const base = `/categories/:id/${segment}`;
  router.get(base, read, asyncHandler(handlers.list));
  router.post(base, create, asyncHandler(handlers.create));
  router.put(`${base}/reorder`, update, asyncHandler(handlers.reorder));
  router.get(`${base}/:entryId`, read, asyncHandler(handlers.getById));
  router.put(`${base}/:entryId`, update, asyncHandler(handlers.update));
  router.put(`${base}/:entryId/status`, update, asyncHandler(handlers.setStatus));
  router.delete(`${base}/:entryId`, destroy, asyncHandler(handlers.remove));
};

mountEntries('steps', stepControllers);
mountEntries('benefits', benefitControllers);

export default router;

/** The website-facing read: the whole section in one response. */
export const publicFmsFranchiseSectionRouter = Router();

publicFmsFranchiseSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmsFranchiseSectionController),
);
