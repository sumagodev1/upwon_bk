// src/modules/clients-page/routes/network-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';
import {
  createClientsNetworkStateController,
  deleteClientsNetworkStateController,
  getAllClientsNetworkStatesController,
  getClientsNetworkStateByIdController,
  getPublicClientsNetworkSectionController,
  reorderClientsNetworkStatesController,
  updateClientsNetworkStateController,
  updateClientsNetworkStateStatusController,
} from '../controllers/network-section.controller';

/**
 * Admin router for the operational network states, mounted under the
 * authenticated API at /clients-page/network-section. The section copy above the
 * band is edited through the shared /home-page/section-copy/clients/network
 * route.
 */

const read = requirePermission(PERMISSIONS.CLIENTS_PAGE_READ);
const create = requirePermission(PERMISSIONS.CLIENTS_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.CLIENTS_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.CLIENTS_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllClientsNetworkStatesController));
router.post('/', create, asyncHandler(createClientsNetworkStateController));
// Declared before '/:id', or 'reorder' would be parsed as an id.
router.put('/reorder', update, asyncHandler(reorderClientsNetworkStatesController));
router.get('/:id', read, asyncHandler(getClientsNetworkStateByIdController));
router.put('/:id', update, asyncHandler(updateClientsNetworkStateController));
router.put('/:id/status', update, asyncHandler(updateClientsNetworkStateStatusController));
router.delete('/:id', destroy, asyncHandler(deleteClientsNetworkStateController));

export default router;

/** The website-facing read: the copy and its states, in one response. */
export const publicClientsNetworkSectionRouter = Router();

publicClientsNetworkSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicClientsNetworkSectionController),
);
