// src/modules/industry-pages/dairy-page/routes/benefits-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createDairyBenefitItemController,
  deleteDairyBenefitItemController,
  getAllDairyBenefitItemsController,
  getDairyBenefitItemByIdController,
  getDairyBenefitsIconsController,
  getDairyBenefitsPanelController,
  getPublicDairyBenefitsSectionController,
  reorderDairyBenefitItemsController,
  updateDairyBenefitItemController,
  updateDairyBenefitItemStatusController,
  upsertDairyBenefitsPanelController,
} from '../controllers/benefits-section.controller';

/**
 * Admin router for the benefits. The copy above them is served by the
 * shared section-copy router under ('dairy', 'benefits').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getDairyBenefitsIconsController));
router.get('/panel', read, asyncHandler(getDairyBenefitsPanelController));
router.put('/panel', update, asyncHandler(upsertDairyBenefitsPanelController));
router.get('/', read, asyncHandler(getAllDairyBenefitItemsController));
router.post('/', create, asyncHandler(createDairyBenefitItemController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderDairyBenefitItemsController));
router.get('/:id', read, asyncHandler(getDairyBenefitItemByIdController));
router.put('/:id', update, asyncHandler(updateDairyBenefitItemController));
router.put('/:id/status', update, asyncHandler(updateDairyBenefitItemStatusController));
router.delete('/:id', destroy, asyncHandler(deleteDairyBenefitItemController));

export default router;

/** The website-facing read: the copy and its benefits, in one response. */
export const publicDairyBenefitsSectionRouter = Router();

publicDairyBenefitsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicDairyBenefitsSectionController),
);
