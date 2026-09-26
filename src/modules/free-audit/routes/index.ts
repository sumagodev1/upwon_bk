// src/modules/free-audit/routes/index.ts

import { Router } from 'express';
import applicationsRoutes, { publicFreeAuditApplicationsRouter } from './applications.routes';
import heroSectionRoutes, { publicFreeAuditHeroSectionRouter } from './hero-section.routes';

/**
 * The /free-audit page, managed from the admin panel's "Resource Page > Free
 * Operational Audit" sidebar item. One router per tab, on the About page's
 * pattern:
 *
 *   /hero-section   ordered child list: the hero carousel's slides, on the Blog
 *                   hero's routes.
 *   /applications   not a section: the records the form on that page produces.
 *                   It is an inbox rather than page content, it carries its own
 *                   permissions, and the form's copy stays in the website's
 *                   code.
 *
 * Nothing else on /free-audit is here. The audit's steps and outputs beside the
 * form, the form's labels and the success panel are static copy in the
 * website's own code and have no section in this CMS.
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/applications', applicationsRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, like the other public routers.
 *
 * /hero-section is always a 200: the ACTIVE slides in order, an empty list when
 * there are none, so the site keeps its built-in slide.
 *
 * Read-only apart from POST /applications, which is one of the five writes
 * anywhere under /public - see applications.routes.ts for why, and
 * scripts/route-audit.js for the allowlist that keeps them the only five.
 */
export const publicFreeAuditRouter = Router();

publicFreeAuditRouter.use('/hero-section', publicFreeAuditHeroSectionRouter);
publicFreeAuditRouter.use('/applications', publicFreeAuditApplicationsRouter);
