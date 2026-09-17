import { RequestHandler } from 'express';
import { AuthorizationError } from '../errors/AuthorizationError';

/**
 * CSRF guard for cookie-authenticated endpoints.
 *
 * A cross-origin <form> POST cannot set a custom header, and a cross-origin
 * XHR/fetch that tries triggers a CORS preflight that our allowlist rejects.
 * Combined with SameSite=Strict on the refresh cookie, this closes CSRF on
 * the only endpoints where a cookie alone authorises an action.
 */
export const requireCsrfHeader: RequestHandler = (req, _res, next) => {
  if (!req.get('X-Requested-With')) {
    return next(
      new AuthorizationError('Missing required request header', 'CSRF_HEADER_MISSING'),
    );
  }
  next();
};
