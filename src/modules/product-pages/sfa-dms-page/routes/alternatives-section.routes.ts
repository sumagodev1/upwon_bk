// src/modules/product-pages/sfa-dms-page/routes/alternatives-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSfaAlternativesColumnController,
  createSfaCapabilityRowController,
  deleteSfaAlternativesColumnController,
  deleteSfaAlternativesSummaryController,
  deleteSfaCapabilityRowController,
  getAllSfaAlternativesColumnsController,
  getAllSfaCapabilityRowsController,
  getPublicSfaAlternativesSectionController,
  getSfaAlternativesColumnByIdController,
  getSfaAlternativesSectionController,
  getSfaAlternativesSummaryController,
  getSfaCapabilityRowByIdController,
  reorderSfaAlternativesColumnsController,
  reorderSfaCapabilityRowsController,
  updateSfaAlternativesColumnController,
  updateSfaAlternativesSectionController,
  updateSfaAlternativesSummaryController,
  updateSfaCapabilityRowController,
  updateSfaCapabilityRowStatusController,
} from '../controllers/alternatives-section.controller';

/**
 * Admin router for the comparison grid.
 *
 * Three groups: the leader column at the root, the competitor columns, and the
 * capability rows - plus the closing summary, which is one record rather than
 * a list because a grid has one closing line.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The leader column.
router.get('/', read, asyncHandler(getSfaAlternativesSectionController));
router.put('/', update, asyncHandler(updateSfaAlternativesSectionController));

// The closing summary. Declared before the id routes below for the same reason
// 'reorder' is: Express matches in registration order.
router.get('/summary', read, asyncHandler(getSfaAlternativesSummaryController));
router.put('/summary', update, asyncHandler(updateSfaAlternativesSummaryController));
router.delete('/summary', destroy, asyncHandler(deleteSfaAlternativesSummaryController));

// The columns.
router.get('/columns', read, asyncHandler(getAllSfaAlternativesColumnsController));
router.post('/columns', create, asyncHandler(createSfaAlternativesColumnController));
router.put('/columns/reorder', update, asyncHandler(reorderSfaAlternativesColumnsController));
router.get('/columns/:id', read, asyncHandler(getSfaAlternativesColumnByIdController));
router.put('/columns/:id', update, asyncHandler(updateSfaAlternativesColumnController));
router.delete('/columns/:id', destroy, asyncHandler(deleteSfaAlternativesColumnController));

// The capability rows.
router.get('/rows', read, asyncHandler(getAllSfaCapabilityRowsController));
router.post('/rows', create, asyncHandler(createSfaCapabilityRowController));
router.put('/rows/reorder', update, asyncHandler(reorderSfaCapabilityRowsController));
router.get('/rows/:id', read, asyncHandler(getSfaCapabilityRowByIdController));
router.put('/rows/:id', update, asyncHandler(updateSfaCapabilityRowController));
router.put('/rows/:id/status', update, asyncHandler(updateSfaCapabilityRowStatusController));
router.delete('/rows/:id', destroy, asyncHandler(deleteSfaCapabilityRowController));

export default router;

/** The website-facing read: the copy, the columns, the rows and the summary. */
export const publicSfaAlternativesSectionRouter = Router();

publicSfaAlternativesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSfaAlternativesSectionController),
);
