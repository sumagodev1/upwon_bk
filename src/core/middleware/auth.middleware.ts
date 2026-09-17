import { RequestHandler } from 'express';
import { SYSTEM_ROLES } from '../../config/constants';
import { AuthenticationError } from '../errors/AuthenticationError';
import { logger } from '../utils/logger';
import { verifyAccessToken } from '../utils/token';
import * as adminRepository from '../../modules/admins/repositories/admin.repository';
import * as permissionService from '../../modules/permissions/services/permission.service';

/**
 * Establishes WHO the caller is. Says nothing about what they may do - that is
 * requirePermission's job.
 *
 * Sequence:
 *   1. extract the bearer token
 *   2. verify signature, expiry, issuer, audience, algorithm, and token type
 *   3. load the admin from the database
 *   4. reject deleted or non-ACTIVE accounts
 *   5. resolve roles and permissions (cached, short TTL)
 *   6. attach req.admin
 *
 * Step 3 is not optional. A valid 15-minute token issued to an admin who was
 * suspended 30 seconds ago must stop working immediately; trusting the token's
 * claims alone would leave a 15-minute window of live access after revocation.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new AuthenticationError('Authentication required', 'TOKEN_MISSING');
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw new AuthenticationError('Authentication required', 'TOKEN_MISSING');
    }

    // Throws TOKEN_EXPIRED / INVALID_TOKEN.
    const payload = verifyAccessToken(token);

    const admin = await adminRepository.findById(payload.sub);
    if (!admin) {
      // The account was deleted after the token was issued.
      throw new AuthenticationError('Account no longer exists', 'ACCOUNT_NOT_FOUND');
    }
    if (admin.status !== 'ACTIVE') {
      throw new AuthenticationError(
        `Your account is ${admin.status.toLowerCase()}`,
        'ACCOUNT_NOT_ACTIVE',
      );
    }

    const { roles, permissions } = await permissionService.resolveForAdmin(admin.id);

    req.admin = {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      roles,
      permissions,
      hasFullAccess: roles.includes(SYSTEM_ROLES.ADMIN),
      sessionId: payload.sid,
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      logger.debug('Authentication rejected', {
        requestId: req.requestId,
        code: error.code,
        path: req.originalUrl.split('?')[0],
      });
    }
    next(error);
  }
};
