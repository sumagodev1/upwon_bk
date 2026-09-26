// src/modules/contact-page/routes/index.ts

import { Router } from 'express';
import contactDetailsRoutes, {
  publicContactDetailsSectionRouter,
} from './contact-details.routes';
import enquiriesRoutes, { publicContactEnquiriesRouter } from './enquiries.routes';
import formSectionRoutes, { publicContactFormSectionRouter } from './form-section.routes';
import heroSectionRoutes, { publicContactHeroSectionRouter } from './hero-section.routes';

/**
 * The Contact page, on the Insider page's pattern: one router per section,
 * each owning its own controller, service, repository, validator and types.
 *
 * Three sections, one per thing a visitor reads on /contact: the hero, the
 * copy and choices around the enquiry form, and the two side cards. The
 * closing CTA above the footer is static artwork in the website's own code and
 * has no section here.
 *
 * Plus one thing that is not a section: /enquiries, the records that form
 * produces. It lives in this module because it is the other half of the form
 * section - a submission is validated against that section's published choices
 * - but it is an inbox rather than page content, and it carries its own
 * permissions.
 */
const router = Router();

router.use('/hero-section', heroSectionRoutes);
router.use('/form-section', formSectionRoutes);
router.use('/contact-details', contactDetailsRoutes);
router.use('/enquiries', enquiriesRoutes);

export default router;

/**
 * The website-facing half of the same sections. Mounted before the
 * authentication middleware in src/routes/index.ts, like the home page's.
 *
 * Read-only apart from POST /enquiries, which is the one write anywhere under
 * /public - see enquiries.routes.ts for why, and scripts/route-audit.js for
 * the allowlist that keeps it the only one.
 */
export const publicContactPageRouter = Router();

publicContactPageRouter.use('/hero-section', publicContactHeroSectionRouter);
publicContactPageRouter.use('/form-section', publicContactFormSectionRouter);
publicContactPageRouter.use('/contact-details', publicContactDetailsSectionRouter);
publicContactPageRouter.use('/enquiries', publicContactEnquiriesRouter);
