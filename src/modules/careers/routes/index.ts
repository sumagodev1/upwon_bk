// src/modules/careers/routes/index.ts

import { Router } from 'express';
import applicationsRoutes, { publicCareerApplicationsRouter } from './applications.routes';
import vacanciesRoutes, { publicCareerVacanciesRouter } from './vacancies.routes';

/**
 * The Careers area: exactly two things, matching the two tabs in the admin.
 *
 *   /vacancies     the job adverts the Open Roles list on /careers renders.
 *   /applications  the people who applied through them.
 *
 * They are one module because an application is meaningless without the
 * vacancy it was made against - the write path reads one to file the other -
 * and two resources because they are guarded by different permissions and
 * written by different people: an administrator authors a vacancy, an
 * anonymous candidate submits an application.
 *
 * The Careers page's hero and its "How we work" and "No matching role?" blocks
 * are static artwork in the website's own code and have no section here.
 */
const router = Router();

router.use('/vacancies', vacanciesRoutes);
router.use('/applications', applicationsRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, like the other public routers.
 *
 * Read-only apart from POST /applications, which is one of the two writes
 * anywhere under /public - see applications.routes.ts for why, and
 * scripts/route-audit.js for the allowlist that keeps them the only two.
 */
export const publicCareersRouter = Router();

publicCareersRouter.use('/vacancies', publicCareerVacanciesRouter);
publicCareersRouter.use('/applications', publicCareerApplicationsRouter);
