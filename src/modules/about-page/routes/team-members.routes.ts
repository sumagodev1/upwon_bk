// src/modules/about-page/routes/team-members.routes.ts

import { Router } from 'express';
import {
  createAboutTeamMemberController,
  deleteAboutTeamMemberController,
  getAboutTeamMemberByIdController,
  getAllAboutTeamMembersController,
  reorderAboutTeamMembersController,
  updateAboutTeamMemberController,
  updateAboutTeamMemberStatusController,
} from '../controllers/team-members.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /about-page/team-members behind authentication.
 *
 * The people on the About page's grid: created, edited, published, reordered and
 * deleted - the same shape as the Careers page's vacancies.
 *
 * Guarded by about_page.read and about_page.update, with no separate create or
 * delete key: a person on this grid is part of the People section rather than an
 * object of their own, and whoever may reword that section may add a colleague to
 * it. The reasoning is written out beside ABOUT_PAGE_UPDATE in config/constants.
 *
 * There is no public router here. The people are served inside
 * /public/about-page/team-section, which is how the page renders them - see that
 * file.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_READ),
  asyncHandler(getAllAboutTeamMembersController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(createAboutTeamMemberController),
);

// Declared before '/:id', or 'reorder' would be parsed as a member id.
router.put(
  '/reorder',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(reorderAboutTeamMembersController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.ABOUT_PAGE_READ),
  asyncHandler(getAboutTeamMemberByIdController),
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(updateAboutTeamMemberController),
);

router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(updateAboutTeamMemberStatusController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ABOUT_PAGE_UPDATE),
  asyncHandler(deleteAboutTeamMemberController),
);

export default router;
