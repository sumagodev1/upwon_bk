// src/modules/vs-sap-page/routes/answer-section.routes.ts

import { Router } from 'express';
import {
  getPublicVsSapAnswerSectionController,
  getVsSapAnswerSectionController,
  replaceVsSapAnswerSectionController,
} from '../controllers/answer-section.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /vs-sap-page/answer-section behind authentication.
 * "The straight answer": its eyebrow and headline, both cards - each a title
 * and its points - and the closing line, read and saved as one record.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_READ),
  asyncHandler(getVsSapAnswerSectionController),
);

router.put(
  '/',
  requirePermission(PERMISSIONS.VS_SAP_PAGE_UPDATE),
  asyncHandler(replaceVsSapAnswerSectionController),
);

export default router;

/** Public router: read-only. 404 while the section has never been authored. */
export const publicVsSapAnswerSectionRouter = Router();

publicVsSapAnswerSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicVsSapAnswerSectionController),
);
