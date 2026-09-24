// src/modules/product-pages/sfa-dms-page/routes/compliance-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSfaComplianceBadgeController,
  deleteSfaComplianceBadgeController,
  getAllSfaComplianceBadgesController,
  getPublicSfaComplianceSectionController,
  getSfaComplianceBadgeByIdController,
  getSfaComplianceSectionController,
  reorderSfaComplianceBadgesController,
  updateSfaComplianceBadgeController,
  updateSfaComplianceBadgeStatusController,
  updateSfaComplianceSectionController,
} from '../controllers/compliance-section.controller';

/**
 * Admin router for the trust establishers.
 *
 * Only the panel headers and the badges are editable here. The sphere beside
 * them draws the home page's integration logos, so it is edited on that
 * section's screen - one list, several pages.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The two panel headers: one record, read and replaced.
router.get('/panels', read, asyncHandler(getSfaComplianceSectionController));
router.put('/panels', update, asyncHandler(updateSfaComplianceSectionController));

// The badges.
router.get('/badges', read, asyncHandler(getAllSfaComplianceBadgesController));
router.post('/badges', create, asyncHandler(createSfaComplianceBadgeController));
/*
 * Declared before '/badges/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/badges/reorder', update, asyncHandler(reorderSfaComplianceBadgesController));
router.get('/badges/:id', read, asyncHandler(getSfaComplianceBadgeByIdController));
router.put('/badges/:id', update, asyncHandler(updateSfaComplianceBadgeController));
router.put(
  '/badges/:id/status',
  update,
  asyncHandler(updateSfaComplianceBadgeStatusController),
);
router.delete('/badges/:id', destroy, asyncHandler(deleteSfaComplianceBadgeController));

export default router;

/** The website-facing read: the copy, both panels and the sphere, in one call. */
export const publicSfaComplianceSectionRouter = Router();

publicSfaComplianceSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSfaComplianceSectionController),
);
