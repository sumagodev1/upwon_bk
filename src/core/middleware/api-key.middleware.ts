import { RequestHandler } from 'express';
import { AuthenticationError } from '../errors/AuthenticationError';
import { sha256 } from '../utils/crypto';
import { logger } from '../utils/logger';
import * as apiKeyService from '../../modules/api-keys/services/api-key.service';
import { authenticate } from './auth.middleware';

/**
 * Alternative authentication path for machine clients.
 *
 * An API key never grants ADMIN, regardless of who created it: a leaked
 * key must not be a total compromise. Its capabilities are exactly the
 * permissions in api_key_scopes, and requirePermission treats it identically
 * to an admin's permission set from that point on.
 */
export const authenticateApiKey: RequestHandler = async (req, _res, next) => {
  try {
    const presented = req.get('X-API-Key');
    if (!presented) {
      throw new AuthenticationError('API key required', 'API_KEY_MISSING');
    }

    const resolved = await apiKeyService.resolve(sha256(presented));
    if (!resolved) {
      logger.warn('Invalid API key presented', { requestId: req.requestId, ip: req.ip });
      throw new AuthenticationError('Invalid API key', 'INVALID_API_KEY');
    }

    req.apiKeyId = resolved.id;
    req.admin = {
      id: resolved.createdBy ?? resolved.id,
      email: `api-key:${resolved.keyPrefix}`,
      firstName: 'API',
      lastName: resolved.name,
      status: 'ACTIVE',
      roles: [],
      permissions: resolved.scopes,
      // Never, under any circumstance.
      hasFullAccess: false,
    };

    // Fire-and-forget: last_used_at is telemetry, not correctness.
    void apiKeyService.touchLastUsed(resolved.id);

    next();
  } catch (error) {
    next(error);
  }
};

/** Accepts either a bearer token or an API key, whichever the client presents. */
export const authenticateBearerOrApiKey: RequestHandler = (req, res, next) => {
  if (req.get('X-API-Key')) return authenticateApiKey(req, res, next);
  return authenticate(req, res, next);
};
