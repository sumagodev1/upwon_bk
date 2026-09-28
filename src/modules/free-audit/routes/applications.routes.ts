// src/modules/free-audit/routes/applications.routes.ts

import { Router } from 'express';
import {
  createPublicFreeAuditApplicationController,
  deleteFreeAuditApplicationController,
  getFreeAuditApplicationByIdController,
  listFreeAuditApplicationsController,
} from '../controllers/applications.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import {
  freeAuditApplicationGlobalRateLimit,
  freeAuditApplicationRateLimit,
} from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

/**
 * Admin router, mounted at /free-audit/applications behind authentication.
 *
 * A records inbox, not a section: it is read and it is deleted, and there is no
 * PUT, no PATCH and no status anywhere on it. A request is what a visitor sent,
 * and an admin who could edit one would be editing evidence.
 *
 * Guarded by its own permissions rather than free_audit.*: reading this is
 * reading strangers' names, mobile numbers and work addresses, which is a
 * different decision from letting somebody rewrite the hero, and the two must be
 * grantable separately.
 */
const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.FREE_AUDIT_APPLICATIONS_READ),
  asyncHandler(listFreeAuditApplicationsController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.FREE_AUDIT_APPLICATIONS_READ),
  asyncHandler(getFreeAuditApplicationByIdController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.FREE_AUDIT_APPLICATIONS_DELETE),
  asyncHandler(deleteFreeAuditApplicationController),
);

export default router;

/**
 * ── THE FIFTH WRITE ON THE PUBLIC SURFACE ────────────────────────────────
 *
 * Everything else under /public is a read of already-published CMS content,
 * apart from the Contact page's enquiry form, the Careers page's application
 * form, the Partner Program's and the About page's discovery call form. This is
 * the fifth such write, and it is unauthenticated for the same reason they are:
 * the caller is a visitor on a marketing page who holds neither an admin token
 * nor an API key. There is no mail transport in this project, so this row is
 * the delivery.
 *
 * Before it existed the form on /free-audit only set `submitted` and showed its
 * thank-you panel: every visitor who asked for an audit was told they would
 * hear back, and nothing was stored anywhere. That is the failure this route is
 * here to end.
 *
 * scripts/route-audit.js holds an explicit allowlist naming this exact route, so
 * the "no writes under /public" check keeps its teeth: any further public write,
 * added by accident or by a merge, still fails the audit. If this route ever
 * moves or is renamed, update PUBLIC_WRITE_ALLOWLIST in that script - the audit
 * fails loudly either way.
 *
 * What stands in for authentication here is the discovery call form's set,
 * guard for guard:
 *
 *   freeAuditApplicationRateLimit        per-IP, and far tighter than
 *                                        standardRateLimit - somebody asks for
 *                                        one audit, not a hundred.
 *   ...GlobalRateLimit                   the backstop, keyed on the TCP peer
 *                                        address, which no header can rewrite -
 *                                        see discoveryCallGlobalRateLimit for
 *                                        the whole argument.
 *   express.json({ limit })              the 1mb body cap in app.ts already
 *                                        applies.
 *   the validator                        every field bounded, the number checked
 *                                        by the shared visitor-phone rule, the
 *                                        address as an address, the revenue
 *                                        range against the four chips.
 *   the response                         a receipt only: { received: true, id }.
 *
 * Nothing here touches storage: this body is JSON and carries no file.
 *
 * There is deliberately no public GET here. A list of other people's names and
 * mobile numbers behind a guessable URL is the failure mode this whole file is
 * written to avoid.
 */
export const publicFreeAuditApplicationsRouter = Router();

publicFreeAuditApplicationsRouter.post(
  '/',
  freeAuditApplicationRateLimit,
  freeAuditApplicationGlobalRateLimit,
  asyncHandler(createPublicFreeAuditApplicationController),
);
