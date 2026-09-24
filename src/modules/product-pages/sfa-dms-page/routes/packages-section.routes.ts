// src/modules/product-pages/sfa-dms-page/routes/packages-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSfaPackageCardController,
  createSfaPackageFeatureController,
  deleteSfaPackageCardController,
  deleteSfaPackageFeatureController,
  getAllSfaPackageCardsController,
  getAllSfaPackageFeaturesController,
  getPublicSfaPackagesSectionController,
  getSfaIconsController,
  getSfaPackageCardByIdController,
  getSfaPackageFeatureByIdController,
  reorderSfaPackageCardsController,
  reorderSfaPackageFeaturesController,
  updateSfaPackageCardController,
  updateSfaPackageCardStatusController,
  updateSfaPackageFeatureController,
  updateSfaPackageFeatureStatusController,
} from '../controllers/packages-section.controller';

/**
 * Admin router for the adoption path.
 *
 * Features are nested under their card, so the URL carries the ownership the
 * service then checks: /cards/:cardId/features/:id can only ever reach a
 * feature that card actually has.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

/*
 * Declared before '/cards/:id' - Express matches in registration order, so a
 * literal segment that comes later gets parsed as an id and fails UUID
 * validation.
 */
router.get('/icons', read, asyncHandler(getSfaIconsController));

// The packages.
router.get('/cards', read, asyncHandler(getAllSfaPackageCardsController));
router.post('/cards', create, asyncHandler(createSfaPackageCardController));
router.put('/cards/reorder', update, asyncHandler(reorderSfaPackageCardsController));
router.get('/cards/:id', read, asyncHandler(getSfaPackageCardByIdController));
router.put('/cards/:id', update, asyncHandler(updateSfaPackageCardController));
router.put('/cards/:id/status', update, asyncHandler(updateSfaPackageCardStatusController));
router.delete('/cards/:id', destroy, asyncHandler(deleteSfaPackageCardController));

// The ticks under one package.
router.get('/cards/:cardId/features', read, asyncHandler(getAllSfaPackageFeaturesController));
router.post('/cards/:cardId/features', create, asyncHandler(createSfaPackageFeatureController));
router.put(
  '/cards/:cardId/features/reorder',
  update,
  asyncHandler(reorderSfaPackageFeaturesController),
);
router.get(
  '/cards/:cardId/features/:id',
  read,
  asyncHandler(getSfaPackageFeatureByIdController),
);
router.put(
  '/cards/:cardId/features/:id',
  update,
  asyncHandler(updateSfaPackageFeatureController),
);
router.put(
  '/cards/:cardId/features/:id/status',
  update,
  asyncHandler(updateSfaPackageFeatureStatusController),
);
router.delete(
  '/cards/:cardId/features/:id',
  destroy,
  asyncHandler(deleteSfaPackageFeatureController),
);

export default router;

/** The website-facing read: the copy and the cards with their ticks, in one call. */
export const publicSfaPackagesSectionRouter = Router();

publicSfaPackagesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSfaPackagesSectionController),
);
