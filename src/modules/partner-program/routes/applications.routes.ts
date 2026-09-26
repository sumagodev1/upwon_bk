// src/modules/partner-program/routes/applications.routes.ts

import { Router } from 'express';
import {
  createPublicPartnerApplicationController,
  deletePartnerApplicationController,
  getPartnerApplicationByIdController,
  listPartnerApplicationsController,
} from '../controllers/applications.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import {
  partnerApplicationGlobalRateLimit,
  partnerApplicationRateLimit,
} from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /partner-program/applications behind authentication.
 *
 * A records list, not a section: it is read and it is deleted, and there is no
 * PUT, no PATCH and no status anywhere on it. An application is what a visitor
 * sent, and an admin who could edit one would be editing evidence.
 *
 * Guarded by its own permissions rather than partner_program.*: reading this is
 * reading strangers' names, mobile numbers and work addresses, which is a
 * different decision from letting somebody rewrite the page's hero, and the two
 * must be grantable separately.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.PARTNER_APPLICATIONS_READ),
  asyncHandler(listPartnerApplicationsController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.PARTNER_APPLICATIONS_READ),
  asyncHandler(getPartnerApplicationByIdController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PARTNER_APPLICATIONS_DELETE),
  asyncHandler(deletePartnerApplicationController),
);

export default router;

/**
 * ── THE THIRD WRITE ON THE PUBLIC SURFACE ────────────────────────────────
 *
 * Everything else under /public is a read of already-published CMS content,
 * apart from the Contact page's enquiry form and the Careers page's application
 * form. This is the third such write, and it is unauthenticated for the same
 * reason they are: the caller is a visitor on a marketing page who holds neither
 * an admin token nor an API key. There is no mail transport in this project, so
 * this row is the delivery - and until it existed the form's submit handler was
 * a window.alert() that delivered nothing at all, which is the failure this
 * route is here to end.
 *
 * scripts/route-audit.js holds an explicit allowlist naming this exact route, so
 * the "no writes under /public" check keeps its teeth: a fourth public write,
 * added by accident or by a merge, still fails the audit. If this route ever
 * moves or is renamed, update PUBLIC_WRITE_ALLOWLIST in that script - the audit
 * fails loudly either way.
 *
 * What stands in for authentication here:
 *
 *   partnerApplicationRateLimit  per-IP, and far tighter than standardRateLimit
 *                                - a partner applies once, not a hundred times.
 *   ...GlobalRateLimit           the same route counted across every caller at
 *                                once, on a key no request can choose. req.ip is
 *                                the last X-Forwarded-For entry once `trust
 *                                proxy` is on, so a per-IP budget is per-header-
 *                                value to anyone who can reach the process
 *                                directly - and the argument is about the key,
 *                                not about a request's cost, so it applies here
 *                                as much as to the Careers upload. This is the
 *                                only bound that survives a chosen key.
 *   express.json({ limit })      the 1mb body cap in app.ts already applies.
 *   the validator                every field bounded, the mobile number checked
 *                                by the shared visitor-phone rule, the address
 *                                checked as an address.
 *   the response                 a receipt only: { received: true, id }.
 *
 * Nothing here touches storage, unlike the Careers form: this body is JSON and
 * carries no file, so there is no upload path to guard. What a flood costs here
 * is the inbox itself - rows are cleared one confirmed dialog at a time - which
 * is why the backstop is worth its two lines even without a 5 MB file behind it.
 *
 * There is deliberately no public GET here. A list of other people's contact
 * details behind a guessable URL is the failure mode this whole file is written
 * to avoid.
 */
export const publicPartnerApplicationsRouter = Router();

publicPartnerApplicationsRouter.post(
  '/',
  partnerApplicationRateLimit,
  partnerApplicationGlobalRateLimit,
  asyncHandler(createPublicPartnerApplicationController),
);
