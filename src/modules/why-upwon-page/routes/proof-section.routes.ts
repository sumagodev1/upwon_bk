// src/modules/why-upwon-page/routes/proof-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  createWhyUpwonProofCalloutController,
  deleteWhyUpwonProofCalloutController,
  getAllWhyUpwonProofCalloutsController,
  getWhyUpwonProofPanelController,
  getWhyUpwonProofIconsController,
  getWhyUpwonProofCalloutByIdController,
  getPublicWhyUpwonProofSectionController,
  reorderWhyUpwonProofCalloutsController,
  updateWhyUpwonProofPanelController,
  updateWhyUpwonProofCalloutController,
  updateWhyUpwonProofCalloutStatusController,
} from '../controllers/proof-section.controller';

/**
 * Admin router for the core callouts.
 *
 * The seven routes a list section gets, the artwork panel read and
 * replaced as one record, and the icon names for the picker. The copy is
 * served by the shared section-copy router under ('why-upwon', 'proof').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/icons', read, asyncHandler(getWhyUpwonProofIconsController));
router.get('/panel', read, asyncHandler(getWhyUpwonProofPanelController));
router.put('/panel', update, asyncHandler(updateWhyUpwonProofPanelController));
router.get('/', read, asyncHandler(getAllWhyUpwonProofCalloutsController));
router.post('/', create, asyncHandler(createWhyUpwonProofCalloutController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderWhyUpwonProofCalloutsController));
router.get('/:id', read, asyncHandler(getWhyUpwonProofCalloutByIdController));
router.put('/:id', update, asyncHandler(updateWhyUpwonProofCalloutController));
router.put('/:id/status', update, asyncHandler(updateWhyUpwonProofCalloutStatusController));
router.delete('/:id', destroy, asyncHandler(deleteWhyUpwonProofCalloutController));

export default router;

/** The website-facing read: the copy, the artwork and the callouts, in one call. */
export const publicWhyUpwonProofSectionRouter = Router();

publicWhyUpwonProofSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWhyUpwonProofSectionController),
);
