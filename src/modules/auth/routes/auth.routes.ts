// src/modules/auth/routes/auth.routes.ts

import { Router } from 'express';
import {
  changePasswordController,
  forgotPasswordController,
  getProfileController,
  listSessionsController,
  loginController,
  logoutAllDevicesController,
  logoutController,
  refreshTokenController,
  resetPasswordController,
  revokeSessionController,
} from '../controllers/auth.controller';
import { authenticate } from '../../../core/middleware/auth.middleware';
import { requireCsrfHeader } from '../../../core/middleware/csrf.middleware';
import {
  forgotPasswordRateLimit,
  loginRateLimit,
  refreshRateLimit,
  resetPasswordRateLimit,
  standardRateLimit,
} from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

// ── public ───────────────────────────────────────────────────────────────
router.post('/login', loginRateLimit, asyncHandler(loginController));

// requireCsrfHeader: the refresh cookie is sent automatically by the browser,
// so this endpoint is CSRF-reachable. A custom header cannot be set by a
// cross-origin form post, and CORS blocks it on XHR.
router.post(
  '/refresh',
  refreshRateLimit,
  requireCsrfHeader,
  asyncHandler(refreshTokenController),
);

router.post(
  '/forgot-password',
  forgotPasswordRateLimit,
  asyncHandler(forgotPasswordController),
);

router.post(
  '/reset-password',
  resetPasswordRateLimit,
  asyncHandler(resetPasswordController),
);

// Logout accepts the cookie alone so an expired access token can still sign out.
router.post('/logout', standardRateLimit, requireCsrfHeader, asyncHandler(logoutController));

// ── authenticated ────────────────────────────────────────────────────────
router.use(authenticate);

router.get('/me', asyncHandler(getProfileController));
router.post('/logout-all', asyncHandler(logoutAllDevicesController));
router.post('/change-password', standardRateLimit, asyncHandler(changePasswordController));
router.get('/sessions', asyncHandler(listSessionsController));
router.delete('/sessions/:id', asyncHandler(revokeSessionController));

export default router;
