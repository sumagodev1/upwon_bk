// src/modules/partner-program/routes/index.ts

import { Router } from 'express';
import applicationsRoutes, { publicPartnerApplicationsRouter } from './applications.routes';
import heroSectionRoutes, { publicPartnerProgramHeroSectionRouter } from './hero-section.routes';

/**
 * The Partner Program area: exactly two things, matching the two tabs in the
 * admin panel.
 *
 *   /applications   the people who applied through the form on /partners.
 *   /hero-section   the band at the top of that page.
 *
 * In that order, because the admin's first tab is the list: the hero is authored
 * once and the applications arrive every week.
 *
 * Only one section, unlike the Contact page's three. The three partnership
 * models, the earnings calculator, the FAQ and the closing copy on /partners are
 * static artwork in the website's own code and have no section here - the user
 * asked for the page hero to become dynamic, and nothing else.
 */
const router = Router();

router.use('/applications', applicationsRoutes);
router.use('/hero-section', heroSectionRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, like the other public routers.
 *
 * Read-only apart from POST /applications, which is one of the three writes
 * anywhere under /public - see applications.routes.ts for why, and
 * scripts/route-audit.js for the allowlist that keeps them the only three.
 */
export const publicPartnerProgramRouter = Router();

publicPartnerProgramRouter.use('/applications', publicPartnerApplicationsRouter);
publicPartnerProgramRouter.use('/hero-section', publicPartnerProgramHeroSectionRouter);
