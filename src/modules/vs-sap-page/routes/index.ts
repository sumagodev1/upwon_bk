// src/modules/vs-sap-page/routes/index.ts

import { Router } from 'express';
import answerSectionRoutes, { publicVsSapAnswerSectionRouter } from './answer-section.routes';
import capabilitiesRoutes from './capabilities.routes';
import comparisonSectionRoutes, {
  publicVsSapComparisonSectionRouter,
} from './comparison-section.routes';
import heroSectionRoutes, { publicVsSapHeroSectionRouter } from './hero-section.routes';

/**
 * The /compare/upwon-vs-sap page, managed from the admin panel's "Resource
 * Page > UpWon vs SAP" sidebar item. One router per section, on the About
 * page's pattern, in the order they are read down the page:
 *
 *   /hero-section         ordered child list: the hero carousel's slides, on
 *                         the Free Audit hero's routes.
 *   /answer-section       singleton: "The straight answer" - its headline, both
 *                         cards with their points, and the closing line.
 *   /comparison-section   singleton: the capability table's copy and its TCO
 *                         row - and /capabilities, the table's rows.
 *
 * The capability rows are their own resource beside their section rather than
 * nested under it - see comparison-section.routes.ts for why.
 *
 * Nothing else on /compare/upwon-vs-sap is here. The "THE MATH" band under the
 * table, the SEO tags and every button are static in the website's own code
 * and have no section in this CMS.
 *
 * Two permission keys cover all of it - vs_sap_page.read and
 * vs_sap_page.update; see the note above VS_SAP_PAGE_READ in config/constants.
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/answer-section', answerSectionRoutes);
router.use('/comparison-section', comparisonSectionRoutes);
router.use('/capabilities', capabilitiesRoutes);

export default router;

/**
 * The website-facing half. Mounted before the authentication middleware in
 * src/routes/index.ts, like the other public routers.
 *
 * /hero-section is always a 200: the ACTIVE slides in order, an empty list when
 * there are none, so the site keeps its built-in slide. /answer-section and
 * /comparison-section answer 404 until authored, so the site keeps its own
 * built-in copy; the capability rows have no public route of their own - they
 * arrive inside /comparison-section, which says "no row authored" through
 * hasCapabilities.
 *
 * Read-only. Nothing under /public/vs-sap-page accepts a write, so
 * scripts/route-audit.js needs no allowlist entry for it.
 */
export const publicVsSapPageRouter = Router();

publicVsSapPageRouter.use('/hero-section', publicVsSapHeroSectionRouter);
publicVsSapPageRouter.use('/answer-section', publicVsSapAnswerSectionRouter);
publicVsSapPageRouter.use('/comparison-section', publicVsSapComparisonSectionRouter);
