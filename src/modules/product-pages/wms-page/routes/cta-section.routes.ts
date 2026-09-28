// src/modules/product-pages/wms-page/routes/cta-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createWmsCtaTrustItemController,
  deleteWmsCtaTrustItemController,
  getAllWmsCtaTrustItemsController,
  getWmsCtaSectionController,
  getWmsCtaTrustItemByIdController,
  getWmsIconsController,
  getPublicWmsCtaSectionController,
  reorderWmsCtaTrustItemsController,
  saveWmsCtaSectionController,
  updateWmsCtaTrustItemController,
  updateWmsCtaTrustItemStatusController,
} from '../controllers/cta-section.controller';

/**
 * Admin router for the closing band.
 *
 * Two groups under one mount: the band itself, which is a singleton, and the
 * trust strip under it, which is a list.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

/*
 * The icon picker is served here rather than from a section of its own: this
 * is the only section on the page that draws icons today, and one allowlist
 * serves the whole page when the others arrive.
 */
router.get('/icons', read, asyncHandler(getWmsIconsController));

// The band. A singleton, so it is a GET and a PUT with no id.
router.get('/', read, asyncHandler(getWmsCtaSectionController));
router.put('/', update, asyncHandler(saveWmsCtaSectionController));

// The trust strip.
router.get('/trust', read, asyncHandler(getAllWmsCtaTrustItemsController));
router.post('/trust', create, asyncHandler(createWmsCtaTrustItemController));
/*
 * Declared before '/trust/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/trust/reorder', update, asyncHandler(reorderWmsCtaTrustItemsController));
router.get('/trust/:id', read, asyncHandler(getWmsCtaTrustItemByIdController));
router.put('/trust/:id', update, asyncHandler(updateWmsCtaTrustItemController));
router.put(
  '/trust/:id/status',
  update,
  asyncHandler(updateWmsCtaTrustItemStatusController),
);
router.delete('/trust/:id', destroy, asyncHandler(deleteWmsCtaTrustItemController));

export default router;

/** The website-facing read: the copy, the band and its trust strip, in one call. */
export const publicWmsCtaSectionRouter = Router();

publicWmsCtaSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWmsCtaSectionController),
);
