// src/modules/industry-pages/engineering-manufacturing-page/routes/faq-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createEngineeringFaqEntryController,
  deleteEngineeringFaqEntryController,
  getAllEngineeringFaqEntriesController,
  getEngineeringFaqEntryByIdController,
  getPublicEngineeringFaqSectionController,
  reorderEngineeringFaqEntriesController,
  updateEngineeringFaqEntryController,
  updateEngineeringFaqEntryStatusController,
} from '../controllers/faq-section.controller';

/** Admin router for the Engineering & Manufacturing page's FAQ. */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();
router.get('/', read, asyncHandler(getAllEngineeringFaqEntriesController));
router.post('/', create, asyncHandler(createEngineeringFaqEntryController));
router.put('/reorder', update, asyncHandler(reorderEngineeringFaqEntriesController));
router.get('/:id', read, asyncHandler(getEngineeringFaqEntryByIdController));
router.put('/:id', update, asyncHandler(updateEngineeringFaqEntryController));
router.put('/:id/status', update, asyncHandler(updateEngineeringFaqEntryStatusController));
router.delete('/:id', destroy, asyncHandler(deleteEngineeringFaqEntryController));

export default router;

/** The website-facing read: the copy and its questions, in one response. */
export const publicEngineeringFaqSectionRouter = Router();

publicEngineeringFaqSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicEngineeringFaqSectionController),
);
