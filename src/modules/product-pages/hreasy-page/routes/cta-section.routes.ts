// src/modules/product-pages/hreasy-page/routes/cta-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createHreasyCtaTrustItemController,
  deleteHreasyCtaTrustItemController,
  getAllHreasyCtaTrustItemsController,
  getHreasyCtaSectionController,
  getHreasyCtaTrustItemByIdController,
  getHreasyIconsController,
  getPublicHreasyCtaSectionController,
  reorderHreasyCtaTrustItemsController,
  saveHreasyCtaSectionController,
  updateHreasyCtaTrustItemController,
  updateHreasyCtaTrustItemStatusController,
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
router.get('/icons', read, asyncHandler(getHreasyIconsController));

// The band. A singleton, so it is a GET and a PUT with no id.
router.get('/', read, asyncHandler(getHreasyCtaSectionController));
router.put('/', update, asyncHandler(saveHreasyCtaSectionController));

// The trust strip.
router.get('/trust', read, asyncHandler(getAllHreasyCtaTrustItemsController));
router.post('/trust', create, asyncHandler(createHreasyCtaTrustItemController));
/*
 * Declared before '/trust/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/trust/reorder', update, asyncHandler(reorderHreasyCtaTrustItemsController));
router.get('/trust/:id', read, asyncHandler(getHreasyCtaTrustItemByIdController));
router.put('/trust/:id', update, asyncHandler(updateHreasyCtaTrustItemController));
router.put(
  '/trust/:id/status',
  update,
  asyncHandler(updateHreasyCtaTrustItemStatusController),
);
router.delete('/trust/:id', destroy, asyncHandler(deleteHreasyCtaTrustItemController));

export default router;

/** The website-facing read: the copy, the band and its trust strip, in one call. */
export const publicHreasyCtaSectionRouter = Router();

publicHreasyCtaSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicHreasyCtaSectionController),
);
