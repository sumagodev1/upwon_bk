// src/modules/industry-pages/dairy-page/routes/capabilities-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createDairyCapabilityCardController,
  deleteDairyCapabilityCardController,
  getAllDairyCapabilityCardsController,
  getDairyCapabilitiesIconsController,
  getDairyCapabilitiesPanelController,
  getDairyCapabilityCardByIdController,
  getPublicDairyCapabilitiesSectionController,
  reorderDairyCapabilityCardsController,
  updateDairyCapabilityCardController,
  updateDairyCapabilityCardStatusController,
  upsertDairyCapabilitiesPanelController,
} from '../controllers/capabilities-section.controller';

/**
 * Admin router for the core capabilities. The copy above them is served by the
 * shared section-copy router under ('dairy', 'capabilities').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getDairyCapabilitiesIconsController));
router.get('/panel', read, asyncHandler(getDairyCapabilitiesPanelController));
router.put('/panel', update, asyncHandler(upsertDairyCapabilitiesPanelController));
router.get('/', read, asyncHandler(getAllDairyCapabilityCardsController));
router.post('/', create, asyncHandler(createDairyCapabilityCardController));
// Declared before '/:id', so 'reorder' is not parsed as an id.
router.put('/reorder', update, asyncHandler(reorderDairyCapabilityCardsController));
router.get('/:id', read, asyncHandler(getDairyCapabilityCardByIdController));
router.put('/:id', update, asyncHandler(updateDairyCapabilityCardController));
router.put('/:id/status', update, asyncHandler(updateDairyCapabilityCardStatusController));
router.delete('/:id', destroy, asyncHandler(deleteDairyCapabilityCardController));

export default router;

/** The website-facing read: the copy and its capabilities, in one response. */
export const publicDairyCapabilitiesSectionRouter = Router();

publicDairyCapabilitiesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicDairyCapabilitiesSectionController),
);
