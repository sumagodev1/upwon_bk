// src/modules/product-pages/vendor-portal-page/routes/proof-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createVmsProofTileController,
  deleteVmsProofTileController,
  getAllVmsProofTilesController,
  getPublicVmsProofSectionController,
  getVmsProofTileByIdController,
  reorderVmsProofTilesController,
  updateVmsProofTileController,
  updateVmsProofTileStatusController,
} from '../controllers/proof-section.controller';

/**
 * Admin router for the proof strip.
 *
 * One flat list, even though the bento holds two kinds of tile: they share an
 * ordering, and that ordering is the layout, so splitting them into two
 * groups would make the one thing an editor most needs to see - what order
 * the grid is in - impossible to read.
 *
 * The copy that heads the strip is not here - it is served by the shared
 * section-copy router under ('vms', 'proof').
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getAllVmsProofTilesController));
router.post('/', create, asyncHandler(createVmsProofTileController));
/*
 * Declared before '/:id' - Express matches in registration order, so the
 * reverse would make 'reorder' get parsed as an id and fail UUID validation.
 */
router.put('/reorder', update, asyncHandler(reorderVmsProofTilesController));
router.get('/:id', read, asyncHandler(getVmsProofTileByIdController));
router.put('/:id', update, asyncHandler(updateVmsProofTileController));
router.put('/:id/status', update, asyncHandler(updateVmsProofTileStatusController));
router.delete('/:id', destroy, asyncHandler(deleteVmsProofTileController));

export default router;

/** The website-facing read: the copy and the tiles, in one call. */
export const publicVmsProofSectionRouter = Router();

publicVmsProofSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicVmsProofSectionController),
);
