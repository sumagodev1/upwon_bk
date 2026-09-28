// src/modules/why-upwon-page/routes/hero-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  getWhyUpwonHeroSectionController,
  getPublicWhyUpwonHeroSectionController,
  updateWhyUpwonHeroSectionController,
} from '../controllers/hero-section.controller';

/** Admin router for the hero: one record, read and replaced. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);

const router = Router();

router.get('/', read, asyncHandler(getWhyUpwonHeroSectionController));
router.put('/', update, asyncHandler(updateWhyUpwonHeroSectionController));

export default router;

/** The website-facing read. Null when the hero has never been authored. */
export const publicWhyUpwonHeroSectionRouter = Router();

publicWhyUpwonHeroSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicWhyUpwonHeroSectionController),
);
