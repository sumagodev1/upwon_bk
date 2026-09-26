// src/modules/industry-pages/spices-agro-page/routes/cta-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  getSpicesAgroCtaSectionController,
  getPublicSpicesAgroCtaSectionController,
  updateSpicesAgroCtaSectionController,
} from '../controllers/cta-section.controller';

/** Admin router for the closing band: one record, read and replaced. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);

const router = Router();

router.get('/', read, asyncHandler(getSpicesAgroCtaSectionController));
router.put('/', update, asyncHandler(updateSpicesAgroCtaSectionController));

export default router;

/** The website-facing read. Null when the band has never been authored. */
export const publicSpicesAgroCtaSectionRouter = Router();

publicSpicesAgroCtaSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSpicesAgroCtaSectionController),
);
