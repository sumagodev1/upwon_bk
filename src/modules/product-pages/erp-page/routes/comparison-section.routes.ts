// src/modules/product-pages/erp-page/routes/comparison-section.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../../../config/constants';
import { requirePermission } from '../../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../../core/utils/async-handler';
import {
  createComparisonCategoryController,
  createComparisonColumnController,
  createComparisonRowController,
  deleteComparisonCategoryController,
  deleteComparisonColumnController,
  deleteComparisonRowController,
  getAllComparisonCategoriesController,
  getAllComparisonColumnsController,
  getComparisonCategoryByIdController,
  getComparisonColumnByIdController,
  getComparisonRowByIdController,
  getComparisonRowsController,
  getComparisonSectionController,
  getPublicComparisonSectionController,
  reorderComparisonCategoriesController,
  reorderComparisonColumnsController,
  reorderComparisonRowsController,
  saveComparisonSectionController,
  updateComparisonCategoryController,
  updateComparisonCategoryStatusController,
  updateComparisonColumnController,
  updateComparisonColumnStatusController,
  updateComparisonRowController,
  updateComparisonRowStatusController,
} from '../controllers/comparison-section.controller';

/**
 * Admin router for the comparison grid.
 *
 * Rows hang off their band for the same reason features hang off an industry:
 * the path says whose they are, so no request can orphan one. A row's cells are
 * written with the row rather than addressed on their own - a cell is one box on
 * the row's form, not a record an editor thinks about separately.
 */

const read = requirePermission(PERMISSIONS.HOME_PAGE_READ);
const create = requirePermission(PERMISSIONS.HOME_PAGE_CREATE);
const update = requirePermission(PERMISSIONS.HOME_PAGE_UPDATE);
const destroy = requirePermission(PERMISSIONS.HOME_PAGE_DELETE);

const router = Router();

router.get('/', read, asyncHandler(getComparisonSectionController));
router.put('/', update, asyncHandler(saveComparisonSectionController));

/*
 * Within each root the literal 'reorder' comes before the ':id' patterns:
 * Express matches in registration order, and the reverse would parse it as an
 * id and fail UUID validation.
 */
router.get('/columns', read, asyncHandler(getAllComparisonColumnsController));
router.post('/columns', create, asyncHandler(createComparisonColumnController));
router.put(
  '/columns/reorder',
  update,
  asyncHandler(reorderComparisonColumnsController),
);
router.get('/columns/:id', read, asyncHandler(getComparisonColumnByIdController));
router.put('/columns/:id', update, asyncHandler(updateComparisonColumnController));
router.put(
  '/columns/:id/status',
  update,
  asyncHandler(updateComparisonColumnStatusController),
);
router.delete(
  '/columns/:id',
  destroy,
  asyncHandler(deleteComparisonColumnController),
);

router.get(
  '/categories',
  read,
  asyncHandler(getAllComparisonCategoriesController),
);
router.post(
  '/categories',
  create,
  asyncHandler(createComparisonCategoryController),
);
router.put(
  '/categories/reorder',
  update,
  asyncHandler(reorderComparisonCategoriesController),
);
router.get(
  '/categories/:id',
  read,
  asyncHandler(getComparisonCategoryByIdController),
);
router.put(
  '/categories/:id',
  update,
  asyncHandler(updateComparisonCategoryController),
);
router.put(
  '/categories/:id/status',
  update,
  asyncHandler(updateComparisonCategoryStatusController),
);
router.delete(
  '/categories/:id',
  destroy,
  asyncHandler(deleteComparisonCategoryController),
);

router.get(
  '/categories/:id/rows',
  read,
  asyncHandler(getComparisonRowsController),
);
router.post(
  '/categories/:id/rows',
  create,
  asyncHandler(createComparisonRowController),
);
router.put(
  '/categories/:id/rows/reorder',
  update,
  asyncHandler(reorderComparisonRowsController),
);
router.get(
  '/categories/:id/rows/:rowId',
  read,
  asyncHandler(getComparisonRowByIdController),
);
router.put(
  '/categories/:id/rows/:rowId',
  update,
  asyncHandler(updateComparisonRowController),
);
router.put(
  '/categories/:id/rows/:rowId/status',
  update,
  asyncHandler(updateComparisonRowStatusController),
);
router.delete(
  '/categories/:id/rows/:rowId',
  destroy,
  asyncHandler(deleteComparisonRowController),
);

export default router;

/** The website-facing read: the whole grid in one response. */
export const publicErpComparisonSectionRouter = Router();

publicErpComparisonSectionRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicComparisonSectionController),
);
