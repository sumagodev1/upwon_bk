// src/modules/product-pages/pos-page/routes/security-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createPosSecurityAssuranceController,
  createPosSecurityBadgeController,
  createPosSecurityLogoController,
  deletePosSecurityAssuranceController,
  deletePosSecurityBadgeController,
  deletePosSecurityLogoController,
  getAllPosSecurityAssurancesController,
  getAllPosSecurityBadgesController,
  getAllPosSecurityLogosController,
  getPosSecurityAssuranceByIdController,
  getPosSecurityBadgeByIdController,
  getPosSecurityLogoByIdController,
  getPosSecuritySectionController,
  getPublicPosSecuritySectionController,
  reorderPosSecurityAssurancesController,
  reorderPosSecurityBadgesController,
  reorderPosSecurityLogosController,
  savePosSecuritySectionController,
  updatePosSecurityAssuranceController,
  updatePosSecurityAssuranceStatusController,
  updatePosSecurityBadgeController,
  updatePosSecurityBadgeStatusController,
  updatePosSecurityLogoController,
  updatePosSecurityLogoStatusController,
} from '../controllers/security-section.controller';

/**
 * Admin router for the security band.
 *
 * Four groups under one mount - the furniture, the badges, the sphere's marks
 * and the assurances. They are one band on the page but four separate edits,
 * which is why they are not one form.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The furniture. A singleton, so it is a GET and a PUT with no id.
router.get('/', read, asyncHandler(getPosSecuritySectionController));
router.put('/', update, asyncHandler(savePosSecuritySectionController));

/*
 * Every 'reorder' is declared before its ':id' sibling - Express matches in
 * registration order, so the reverse would make 'reorder' get parsed as an id
 * and fail UUID validation.
 */

// The compliance badges.
router.get('/badges', read, asyncHandler(getAllPosSecurityBadgesController));
router.post('/badges', create, asyncHandler(createPosSecurityBadgeController));
router.put('/badges/reorder', update, asyncHandler(reorderPosSecurityBadgesController));
router.get('/badges/:id', read, asyncHandler(getPosSecurityBadgeByIdController));
router.put('/badges/:id', update, asyncHandler(updatePosSecurityBadgeController));
router.put('/badges/:id/status', update, asyncHandler(updatePosSecurityBadgeStatusController));
router.delete('/badges/:id', destroy, asyncHandler(deletePosSecurityBadgeController));

// The sphere's marks.
router.get('/logos', read, asyncHandler(getAllPosSecurityLogosController));
router.post('/logos', create, asyncHandler(createPosSecurityLogoController));
router.put('/logos/reorder', update, asyncHandler(reorderPosSecurityLogosController));
router.get('/logos/:id', read, asyncHandler(getPosSecurityLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updatePosSecurityLogoController));
router.put('/logos/:id/status', update, asyncHandler(updatePosSecurityLogoStatusController));
router.delete('/logos/:id', destroy, asyncHandler(deletePosSecurityLogoController));

// The assurances.
router.get('/assurances', read, asyncHandler(getAllPosSecurityAssurancesController));
router.post('/assurances', create, asyncHandler(createPosSecurityAssuranceController));
router.put('/assurances/reorder', update, asyncHandler(reorderPosSecurityAssurancesController));
router.get('/assurances/:id', read, asyncHandler(getPosSecurityAssuranceByIdController));
router.put('/assurances/:id', update, asyncHandler(updatePosSecurityAssuranceController));
router.put(
  '/assurances/:id/status',
  update,
  asyncHandler(updatePosSecurityAssuranceStatusController),
);
router.delete('/assurances/:id', destroy, asyncHandler(deletePosSecurityAssuranceController));

export default router;

/** The website-facing read: the copy, the furniture and all three lists. */
export const publicPosSecuritySectionRouter = Router();

publicPosSecuritySectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicPosSecuritySectionController),
);
