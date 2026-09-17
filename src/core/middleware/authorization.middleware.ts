import { Request, RequestHandler } from 'express';
import {
  AUDIT_ACTIONS,
  PermissionKey,
  SYSTEM_ROLES,
  SystemRole,
} from '../../config/constants';
import { AuthenticationError } from '../errors/AuthenticationError';
import { AuthorizationError } from '../errors/AuthorizationError';
import { buildContext } from '../utils/context';
import { logger } from '../utils/logger';
import * as auditLogService from '../../modules/audit-logs/services/audit-log.service';

/**
 * A denial is a security event, not just a 4xx. Logged at WARN and written to
 * the audit trail so repeated probing is visible without log aggregation.
 */
function denyAndRecord(
  req: Request,
  requirement: string,
  detail: Record<string, unknown>,
): AuthorizationError {
  logger.warn('Authorization denied', {
    requestId: req.requestId,
    adminId: req.admin?.id ?? null,
    method: req.method,
    path: req.originalUrl.split('?')[0],
    requirement,
    ...detail,
  });

  // Best-effort, non-transactional: a failed audit write must not change the
  // 403 into a 500.
  void auditLogService.record(
    {
      action: AUDIT_ACTIONS.UNAUTHORIZED_ACCESS_ATTEMPT,
      module: 'authorization',
      entityType: 'endpoint',
      entityId: `${req.method} ${req.originalUrl.split('?')[0]}`.slice(0, 64),
      newValues: { requirement, ...detail },
    },
    buildContext(req),
  );

  // The message names the missing permission. This is a deliberate trade-off:
  // these are internal, authenticated administrators, and telling them exactly
  // what they lack turns a support ticket into a self-service answer.
  // Do NOT copy this pattern to a customer-facing API.
  return new AuthorizationError(
    `Insufficient permissions. Required: ${requirement}`,
    'INSUFFICIENT_PERMISSIONS',
    detail,
  );
}

function assertAuthenticated(req: Request): asserts req is Request & {
  admin: NonNullable<Request['admin']>;
} {
  if (!req.admin) {
    // A programming error: a permission guard was mounted without authenticate().
    throw new AuthenticationError('Authentication required', 'TOKEN_MISSING');
  }
}

/**
 * Requires a single permission key.
 *
 *   router.patch('/:id', requirePermission(PERMISSIONS.ORGANIZATIONS_UPDATE), handler)
 *
 * ADMIN short-circuits every check. That role's grants are NOT stored as
 * rows, so this branch is the whole implementation of its access.
 */
export function requirePermission(permission: PermissionKey): RequestHandler {
  return (req, _res, next) => {
    try {
      assertAuthenticated(req);
      if (req.admin.hasFullAccess) return next();

      if (!req.admin.permissions.has(permission)) {
        return next(denyAndRecord(req, permission, { missing: permission }));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Passes when the admin holds ANY of the listed permissions (OR). */
export function requireAnyPermission(...permissions: PermissionKey[]): RequestHandler {
  return (req, _res, next) => {
    try {
      assertAuthenticated(req);
      if (req.admin.hasFullAccess) return next();

      const held = permissions.some((permission) => req.admin.permissions.has(permission));
      if (!held) {
        return next(denyAndRecord(req, permissions.join(' OR '), { anyOf: permissions }));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Passes only when the admin holds EVERY listed permission (AND). */
export function requireAllPermissions(...permissions: PermissionKey[]): RequestHandler {
  return (req, _res, next) => {
    try {
      assertAuthenticated(req);
      if (req.admin.hasFullAccess) return next();

      const missing = permissions.filter(
        (permission) => !req.admin.permissions.has(permission),
      );
      if (missing.length > 0) {
        return next(denyAndRecord(req, permissions.join(' AND '), { missing }));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Role-based guard.
 *
 * Prefer requirePermission for endpoints - permissions are editable at runtime,
 * roles are not. Use this only where the rule genuinely is about identity
 * rather than capability, e.g. "only an ADMIN may edit sensitive settings".
 */
export function requireRole(...roles: SystemRole[]): RequestHandler {
  return (req, _res, next) => {
    try {
      assertAuthenticated(req);
      // ADMIN satisfies every role requirement.
      if (req.admin.hasFullAccess) return next();

      const held = roles.some((role) => req.admin.roles.includes(role));
      if (!held) {
        return next(denyAndRecord(req, roles.join(' OR '), { requiredRoles: roles }));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireRootAdmin: RequestHandler = requireRole(SYSTEM_ROLES.ADMIN);
