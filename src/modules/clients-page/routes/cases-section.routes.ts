// src/modules/clients-page/routes/cases-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  createClientsCaseCardController,
  deleteClientsCaseCardController,
  getAllClientsCaseCardsController,
  getClientsCaseCardByIdController,
  getPublicClientsCaseStoryController,
  getPublicClientsCasesSectionController,
  reorderClientsCaseCardsController,
  updateClientsCaseCardController,
  updateClientsCaseCardStatusController,
  updateClientsCaseSectionStatusController,
} from '../controllers/cases-section.controller';
import { STORY_ROW_KINDS } from '../utils/story-row-kinds';
import { registerStoryRowRoutes } from './story-rows.routes';

/**
 * Admin router for the featured case study cards, mounted under the
 * authenticated API at /clients-page/cases-section. The section copy above the
 * grid is edited through the shared /home-page/section-copy/clients/outcomes
 * route.
 */

const read = requirePermission(PERMISSIONS.CLIENTS_PAGE_READ);
const create = requirePermission(PERMISSIONS.CLIENTS_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.CLIENTS_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.CLIENTS_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllClientsCaseCardsController));
router.post('/', create, asyncHandler(createClientsCaseCardController));
// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put('/reorder', update, asyncHandler(reorderClientsCaseCardsController));
router.get('/:id', read, asyncHandler(getClientsCaseCardByIdController));
router.put('/:id', update, asyncHandler(updateClientsCaseCardController));
router.put('/:id/status', update, asyncHandler(updateClientsCaseCardStatusController));
router.put(
  '/:id/sections/:section/status',
  update,
  asyncHandler(updateClientsCaseSectionStatusController),
);

// The story's list sections, each managed row by row under its case study:
// /:caseId/outcomes, /:caseId/challenges, /:caseId/timeline, /:caseId/deliverables.
for (const kind of STORY_ROW_KINDS) {
  registerStoryRowRoutes(router, kind);
}
router.delete('/:id', destroy, asyncHandler(deleteClientsCaseCardController));

export default router;

/**
 * The website-facing reads: the copy and its cards in one response, and one
 * card's full story for /clients/<slug>.
 */
export const publicClientsCasesSectionRouter = Router();

publicClientsCasesSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicClientsCasesSectionController),
);

publicClientsCasesSectionRouter.get(
  '/stories/:slug',
  standardRateLimit,
  asyncHandler(getPublicClientsCaseStoryController),
);
