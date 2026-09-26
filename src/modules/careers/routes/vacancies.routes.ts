// src/modules/careers/routes/vacancies.routes.ts

import { Router } from 'express';
import {
  createCareerVacancyController,
  deleteCareerVacancyController,
  getAllCareerVacanciesController,
  getCareerVacancyByIdController,
  getPublicCareerVacanciesController,
  reorderCareerVacanciesController,
  updateCareerVacancyController,
  updateCareerVacancyStatusController,
} from '../controllers/vacancies.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { standardRateLimit } from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /careers/vacancies behind authentication.
 *
 * The Vacancy Management tab: an ordered list of job adverts that are created,
 * edited, published, reordered and deleted - the same shape as the Insider
 * page's stories, and guarded by its own careers.* permissions rather than by
 * the application inbox's, because posting a role and reading everyone who
 * applied for it are different decisions.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.CAREERS_READ),
  asyncHandler(getAllCareerVacanciesController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.CAREERS_CREATE),
  asyncHandler(createCareerVacancyController),
);

// Declared before '/:id', or 'reorder' would be parsed as a vacancy id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.CAREERS_UPDATE),
  asyncHandler(reorderCareerVacanciesController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CAREERS_READ),
  asyncHandler(getCareerVacancyByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.CAREERS_UPDATE),
  asyncHandler(updateCareerVacancyController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.CAREERS_UPDATE),
  asyncHandler(updateCareerVacancyStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.CAREERS_DELETE),
  asyncHandler(deleteCareerVacancyController),
);

export default router;

/**
 * Public router, mounted outside the authenticated API: the Open Roles list,
 * read-only, ACTIVE vacancies only, in the narrowed PublicCareerVacancy shape.
 * The reasoning is the home hero's - see
 * home-page/routes/hero-section.routes.ts.
 *
 * There is no public GET /:id beside it. Everything the details popup shows is
 * already on the list response, so a second route would only add a way to
 * probe ids for one that is INACTIVE.
 */
export const publicCareerVacanciesRouter = Router();

publicCareerVacanciesRouter.get(
  '/',
  standardRateLimit,
  asyncHandler(getPublicCareerVacanciesController),
);
