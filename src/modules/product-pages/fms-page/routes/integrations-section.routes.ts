// src/modules/product-pages/fms-page/routes/integrations-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createFmsIntegrationLogoController,
  deleteFmsIntegrationLogoController,
  getAllFmsIntegrationLogosController,
  getFmsIntegrationLogoByIdController,
  getFmsIntegrationSectionController,
  getPublicFmsIntegrationsSectionController,
  reorderFmsIntegrationLogosController,
  saveFmsIntegrationSectionController,
  updateFmsIntegrationLogoController,
  updateFmsIntegrationLogoStatusController,
} from '../controllers/integrations-section.controller';

/**
 * Admin router for the integration sphere.
 *
 * The centre mark sits at the root because there is one of it; the orbit marks
 * are a list under '/logos'. PUT rather than POST on the root: saving it twice
 * leaves the same single record, which is what an upsert means.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getFmsIntegrationSectionController));
router.put('/', update, asyncHandler(saveFmsIntegrationSectionController));

router.get('/logos', read, asyncHandler(getAllFmsIntegrationLogosController));
router.post('/logos', create, asyncHandler(createFmsIntegrationLogoController));
/*
 * Declared before '/logos/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/logos/reorder', update, asyncHandler(reorderFmsIntegrationLogosController));
router.get('/logos/:id', read, asyncHandler(getFmsIntegrationLogoByIdController));
router.put('/logos/:id', update, asyncHandler(updateFmsIntegrationLogoController));
router.put(
  '/logos/:id/status',
  update,
  asyncHandler(updateFmsIntegrationLogoStatusController),
);
router.delete('/logos/:id', destroy, asyncHandler(deleteFmsIntegrationLogoController));

export default router;

/** The website-facing read: the whole section in one response. */
export const publicFmsIntegrationsSectionRouter = Router();

publicFmsIntegrationsSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicFmsIntegrationsSectionController),
);
