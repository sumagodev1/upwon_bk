// src/modules/vs-sap-page/routes/comparison-section.routes.ts

import { Router } from 'express';
import {
  getPublicVsSapComparisonSectionController,
  getVsSapComparisonSectionController,
  replaceVsSapComparisonSectionController,
} from '../controllers/comparison-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /vs-sap-page/comparison-section behind
 * authentication. The table's COPY only - its eyebrow, headline, description
 * and TCO row labels.
 *
 * The capability rows are /vs-sap-page/capabilities, a resource of their own,
 * even though the page renders them as one table: a save of the headline must
 * not be able to reorder or delete a row - the About page's Number section and
 * its stat cards are the precedent.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_READ),
  asyncHandler(getVsSapComparisonSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(replaceVsSapComparisonSectionController),
);

export default router;

/**
 * Public router: read-only, the copy with its ACTIVE capability rows embedded
 * in display order - one route for both halves, as the page renders them.
 */
export const publicVsSapComparisonSectionRouter = Router();

publicVsSapComparisonSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicVsSapComparisonSectionController),
);
