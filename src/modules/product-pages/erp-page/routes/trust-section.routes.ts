// src/modules/product-pages/erp-page/routes/trust-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createErpTrustEntryController,
  deleteErpTrustEntryController,
  getAllErpTrustEntriesController,
  getErpTrustEntryByIdController,
  getPublicErpTrustSectionController,
  reorderErpTrustEntriesController,
  updateErpTrustEntryController,
  updateErpTrustEntryStatusController,
} from '../controllers/trust-section.controller';

/** Admin router for the ERP proof strip: the brand marquee and the counters. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllErpTrustEntriesController));
router.post('/', create, asyncHandler(createErpTrustEntryController));
router.put('/reorder', update, asyncHandler(reorderErpTrustEntriesController));
router.get('/:id', read, asyncHandler(getErpTrustEntryByIdController));
router.put('/:id', update, asyncHandler(updateErpTrustEntryController));
router.put('/:id/status', update, asyncHandler(updateErpTrustEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteErpTrustEntryController));

export default router;

/**
 * One endpoint returning the assembled section, not the entries: the site
 * renders one card, and folding the rows back into that shape is the server's
 * job rather than the browser's.
 */
export const publicErpTrustSectionRouter = Router();

publicErpTrustSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicErpTrustSectionController),
);
