// src/modules/clients-page/routes/roster-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  createClientsRosterLogoController,
  deleteClientsRosterLogoController,
  getAllClientsRosterLogosController,
  getClientsRosterLogoByIdController,
  getPublicClientsRosterSectionController,
  reorderClientsRosterLogosController,
  updateClientsRosterLogoController,
  updateClientsRosterLogoStatusController,
} from '../controllers/roster-section.controller';

/**
 * Admin router for the roster logos (the marquee), mounted under the
 * authenticated API at /clients-page/roster-section. The section copy above the
 * grid is edited through the shared /home-page/section-copy/clients/trust
 * route.
 */

const read = requirePermission(PERMISSIONS.CLIENTS_PAGE_READ);
const create = requirePermission(PERMISSIONS.CLIENTS_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.CLIENTS_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.CLIENTS_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllClientsRosterLogosController));
router.post('/', create, asyncHandler(createClientsRosterLogoController));
// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put('/reorder', update, asyncHandler(reorderClientsRosterLogosController));
router.get('/:id', read, asyncHandler(getClientsRosterLogoByIdController));
router.put('/:id', update, asyncHandler(updateClientsRosterLogoController));
router.put('/:id/status', update, asyncHandler(updateClientsRosterLogoStatusController));
router.delete('/:id', destroy, asyncHandler(deleteClientsRosterLogoController));

export default router;

/** The website-facing read: the copy and its logos, in one response. */
export const publicClientsRosterSectionRouter = Router();

publicClientsRosterSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicClientsRosterSectionController),
);
