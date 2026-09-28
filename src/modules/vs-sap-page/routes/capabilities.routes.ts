// src/modules/vs-sap-page/routes/capabilities.routes.ts

import { Router } from 'express';
import {
  createVsSapCapabilityController,
  deleteVsSapCapabilityController,
  getAllVsSapCapabilitiesController,
  getVsSapCapabilityByIdController,
  reorderVsSapCapabilitiesController,
  updateVsSapCapabilityController,
  updateVsSapCapabilityStatusController,
} from '../controllers/capabilities.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /vs-sap-page/capabilities behind authentication.
 *
 * The comparison table's rows: created, edited, published, reordered and
 * deleted, on the same shape as the About page's stat cards.
 *
 * Guarded by vs_sap_page.read and vs_sap_page.update, with no separate create
 * or delete key - see VS_SAP_PAGE_UPDATE in config/constants.
 *
 * There is no public router here. The rows are served inside
 * /public/vs-sap-page/comparison-section, which is how the page renders them.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_READ),
  asyncHandler(getAllVsSapCapabilitiesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(createVsSapCapabilityController),
);

// Declared before '/:id', or 'reorder' would be parsed as a capability id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(reorderVsSapCapabilitiesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_READ),
  asyncHandler(getVsSapCapabilityByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(updateVsSapCapabilityController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(updateVsSapCapabilityStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(deleteVsSapCapabilityController),
);

export default router;
