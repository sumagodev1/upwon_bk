// src/modules/product-pages/sfa-dms-page/routes/outcomes-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createSfaOutcomeCardController,
  deleteSfaOutcomeCardController,
  getAllSfaOutcomeCardsController,
  getPublicSfaOutcomesSectionController,
  getSfaOutcomeCardByIdController,
  getSfaOutcomeSectionController,
  reorderSfaOutcomeCardsController,
  updateSfaOutcomeCardController,
  updateSfaOutcomeCardStatusController,
  updateSfaOutcomeSectionController,
} from '../controllers/outcomes-section.controller';

/**
 * Admin router for the customer stories.
 *
 * The pair of buttons beside the heading is one record; the stories are a list.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

// The two buttons: one record, read and replaced.
router.get('/buttons', read, asyncHandler(getSfaOutcomeSectionController));
router.put('/buttons', update, asyncHandler(updateSfaOutcomeSectionController));

// The stories.
router.get('/cards', read, asyncHandler(getAllSfaOutcomeCardsController));
router.post('/cards', create, asyncHandler(createSfaOutcomeCardController));
/*
 * Declared before '/cards/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/cards/reorder', update, asyncHandler(reorderSfaOutcomeCardsController));
router.get('/cards/:id', read, asyncHandler(getSfaOutcomeCardByIdController));
router.put('/cards/:id', update, asyncHandler(updateSfaOutcomeCardController));
router.put('/cards/:id/status', update, asyncHandler(updateSfaOutcomeCardStatusController));
router.delete('/cards/:id', destroy, asyncHandler(deleteSfaOutcomeCardController));

export default router;

/** The website-facing read: the copy, the buttons and the stories, in one call. */
export const publicSfaOutcomesSectionRouter = Router();

publicSfaOutcomesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicSfaOutcomesSectionController),
);
