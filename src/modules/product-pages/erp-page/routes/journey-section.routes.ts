// src/modules/product-pages/erp-page/routes/journey-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createErpJourneyOutcomeController,
  createErpJourneyPersonaController,
  createErpJourneyPointController,
  createErpJourneyStatController,
  deleteErpJourneyOutcomeController,
  deleteErpJourneyPersonaController,
  deleteErpJourneyPointController,
  deleteErpJourneyStatController,
  getAllErpJourneyPersonasController,
  getAllErpJourneyStatsController,
  getErpJourneyOutcomeByIdController,
  getErpJourneyOutcomesController,
  getErpJourneyPersonaByIdController,
  getErpJourneyPointByIdController,
  getErpJourneyPointsController,
  getErpJourneyStatByIdController,
  getPublicErpJourneySectionController,
  reorderErpJourneyOutcomesController,
  reorderErpJourneyPersonasController,
  reorderErpJourneyPointsController,
  reorderErpJourneyStatsController,
  updateErpJourneyOutcomeController,
  updateErpJourneyOutcomeStatusController,
  updateErpJourneyPersonaController,
  updateErpJourneyPersonaStatusController,
  updateErpJourneyPointController,
  updateErpJourneyPointStatusController,
  updateErpJourneyStatController,
  updateErpJourneyStatStatusController,
} from '../controllers/journey-section.controller';

/**
 * Admin router for "UPWON ERP - Benefits for Everyone".
 *
 * Both child lists hang off their persona for the same reason features hang off
 * an industry: the path says whose they are, so no request can orphan one.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

/*
 * 'stats' is declared before 'personas/:id' only for readability - they are
 * different path roots. Within each root the literal segments ('reorder',
 * 'stats') come before the ':id' patterns, because Express matches in
 * registration order and the reverse would parse them as ids.
 */
router.get('/stats', read, asyncHandler(getAllErpJourneyStatsController));
router.post('/stats', create, asyncHandler(createErpJourneyStatController));
router.put('/stats/reorder', update, asyncHandler(reorderErpJourneyStatsController));
router.get('/stats/:id', read, asyncHandler(getErpJourneyStatByIdController));
router.put('/stats/:id', update, asyncHandler(updateErpJourneyStatController));
router.put(
  '/stats/:id/status',
  update,
  asyncHandler(updateErpJourneyStatStatusController),
);
router.delete('/stats/:id', destroy, asyncHandler(deleteErpJourneyStatController));

router.get('/personas', read, asyncHandler(getAllErpJourneyPersonasController));
router.post('/personas', create, asyncHandler(createErpJourneyPersonaController));
router.put(
  '/personas/reorder',
  update,
  asyncHandler(reorderErpJourneyPersonasController),
);
router.get('/personas/:id', read, asyncHandler(getErpJourneyPersonaByIdController));
router.put('/personas/:id', update, asyncHandler(updateErpJourneyPersonaController));
router.put(
  '/personas/:id/status',
  update,
  asyncHandler(updateErpJourneyPersonaStatusController),
);
router.delete(
  '/personas/:id',
  destroy,
  asyncHandler(deleteErpJourneyPersonaController),
);

router.get(
  '/personas/:id/outcomes',
  read,
  asyncHandler(getErpJourneyOutcomesController),
);
router.post(
  '/personas/:id/outcomes',
  create,
  asyncHandler(createErpJourneyOutcomeController),
);
router.put(
  '/personas/:id/outcomes/reorder',
  update,
  asyncHandler(reorderErpJourneyOutcomesController),
);
router.get(
  '/personas/:id/outcomes/:outcomeId',
  read,
  asyncHandler(getErpJourneyOutcomeByIdController),
);
router.put(
  '/personas/:id/outcomes/:outcomeId',
  update,
  asyncHandler(updateErpJourneyOutcomeController),
);
router.put(
  '/personas/:id/outcomes/:outcomeId/status',
  update,
  asyncHandler(updateErpJourneyOutcomeStatusController),
);
router.delete(
  '/personas/:id/outcomes/:outcomeId',
  destroy,
  asyncHandler(deleteErpJourneyOutcomeController),
);

router.get('/personas/:id/points', read, asyncHandler(getErpJourneyPointsController));
router.post(
  '/personas/:id/points',
  create,
  asyncHandler(createErpJourneyPointController),
);
router.put(
  '/personas/:id/points/reorder',
  update,
  asyncHandler(reorderErpJourneyPointsController),
);
router.get(
  '/personas/:id/points/:pointId',
  read,
  asyncHandler(getErpJourneyPointByIdController),
);
router.put(
  '/personas/:id/points/:pointId',
  update,
  asyncHandler(updateErpJourneyPointController),
);
router.put(
  '/personas/:id/points/:pointId/status',
  update,
  asyncHandler(updateErpJourneyPointStatusController),
);
router.delete(
  '/personas/:id/points/:pointId',
  destroy,
  asyncHandler(deleteErpJourneyPointController),
);

export default router;

/** The website-facing read: the whole section in one response. */
export const publicErpJourneySectionRouter = Router();

publicErpJourneySectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicErpJourneySectionController),
);
