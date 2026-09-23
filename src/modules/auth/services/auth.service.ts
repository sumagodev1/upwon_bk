// src/modules/auth/services/auth.service.ts

import { withTransaction } from '../../../config/database';
import { env } from '../../../config/env';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { AuthenticationError } from '../../../core/errors/AuthenticationError';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { RequestContext } from '../../../core/types/common.types';
import { logger } from '../../../core/utils/logger';
import {
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from '../../../core/utils/password';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../../../core/utils/token';
import { generateSecureToken, sha256 } from '../../../core/utils/crypto';
import * as adminRepository from '../../admins/repositories/admin.repository';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as notificationService from '../../notifications/services/notification.service';
import * as permissionRepository from '../../permissions/repositories/permission.repository';
import * as permissionService from '../../permissions/services/permission.service';
import * as authRepository from '../repositories/auth.repository';
import { DeviceInfo } from '../types/auth.types';
import {
  ChangePasswordDto,
  LoginDto,
  LoginResultDto,
  ResetPasswordDto,
  SessionDto,
  toSessionDto,
} from '../types/auth.dto';

export interface IssuedTokens {
  accessToken: string;
  expiresIn: string;
  /** Raw - the controller writes it to the cookie and drops it. */
  refreshToken: string;
  refreshExpiresAt: Date;
  sessionId: string;
}

/**
 * Failed logins are audited with admin_id NULL - at this point the actor is
 * unauthenticated and may not correspond to a real account. The email is
 * recorded so repeated attempts against one account are queryable.
 */
const recordFailedLogin = async (
  email: string,
  reason: string,
  context: RequestContext,
): Promise<void> => {
  await auditLogService.record(
    {
      action: AUDIT_ACTIONS.ADMIN_LOGIN_FAILED,
      module: 'auth',
      entityType: 'admin',
      newValues: { email, reason },
    },
    { ...context, adminId: null },
  );
};

// ── login ──────────────────────────────────────────────────────────────────

export const login = async (
  input: LoginDto,
  device: DeviceInfo,
  context: RequestContext,
): Promise<{ result: LoginResultDto; tokens: IssuedTokens }> => {
  const admin = await adminRepository.findByEmailWithPassword(input.email);

  // Unknown email: burn the same ~150ms bcrypt cost, then fail identically to
  // a wrong password. The two paths must be indistinguishable to the client.
  if (!admin) {
    await verifyAgainstDummy(input.password);
    await recordFailedLogin(input.email, 'UNKNOWN_EMAIL', context);
    throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await verifyPassword(input.password, admin.passwordHash);
  if (!passwordMatches) {
    await recordFailedLogin(input.email, 'BAD_PASSWORD', context);
    throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Status is checked AFTER the password. Checking it first would tell an
  // attacker holding a wrong password that the account exists.
  if (admin.status !== 'ACTIVE') {
    await recordFailedLogin(input.email, `STATUS_${admin.status}`, context);
    throw new AuthenticationError(
      `Your account is ${admin.status.toLowerCase()}. Contact a super administrator.`,
      'ACCOUNT_NOT_ACTIVE',
    );
  }

  // Resolve through the service, not the repository: it expands ADMIN to
  // the full catalogue, so the client never sees an empty permission list for
  // the most privileged account.
  permissionService.invalidateAdmin(admin.id);
  const { roles, permissions } = await permissionService.resolveForAdmin(admin.id);

  const rawRefreshToken = generateRefreshToken();
  const expiresAt = refreshTokenExpiry();

  const session = await withTransaction(async (client) => {
    // Cap concurrent devices before inserting the new one.
    const revoked = await authRepository.revokeOldestSessionsBeyondLimit(
      admin.id,
      env.maxSessionsPerAdmin,
      client,
    );
    if (revoked > 0) {
      logger.info('Session limit enforced', { adminId: admin.id, revoked });
    }

    const created = await authRepository.createSession(
      {
        adminId: admin.id,
        refreshTokenHash: hashRefreshToken(rawRefreshToken),
        deviceName: input.deviceName ?? device.deviceName,
        userAgent: device.userAgent,
        ipAddress: device.ipAddress,
        expiresAt,
      },
      client,
    );

    await adminRepository.updateLastLogin(admin.id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ADMIN_LOGIN,
        module: 'auth',
        entityType: 'admin',
        entityId: admin.id,
        newValues: {
          sessionId: created.id,
          deviceName: created.deviceName,
          // No token, no hash, no password.
        },
      },
      { ...context, adminId: admin.id },
      client,
    );

    return created;
  });

  const { token: accessToken, expiresIn } = signAccessToken({
    adminId: admin.id,
    sessionId: session.id,
    email: admin.email,
    roles,
  });

  return {
    result: {
      accessToken,
      expiresIn,
      tokenType: 'Bearer',
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        status: admin.status,
        roles,
        permissions: [...permissions].sort(),
        lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
      },
    },
    tokens: {
      accessToken,
      expiresIn,
      refreshToken: rawRefreshToken,
      refreshExpiresAt: expiresAt,
      sessionId: session.id,
    },
  };
};

// ── refresh with rotation ──────────────────────────────────────────────────

/**
 * Outcome of the refresh transaction.
 *
 * The revoking branches return a marker instead of throwing. Throwing inside
 * withTransaction triggers a ROLLBACK, which would undo the very revocation
 * and audit record the branch just wrote - the caller would see a 401 while
 * the attacker's rotated token stayed alive. The throw therefore happens after
 * the transaction has committed.
 */
type RefreshOutcome =
  | { kind: 'rotated'; tokens: IssuedTokens }
  | { kind: 'reuse'; adminId: string; sessionId: string; revokedSessions: number }
  | { kind: 'inactive'; adminId: string; status: string };

export const refresh = async (
  rawRefreshToken: string,
  device: DeviceInfo,
  context: RequestContext,
): Promise<IssuedTokens> => {
  const presentedHash = hashRefreshToken(rawRefreshToken);
  const newRawToken = generateRefreshToken();
  const newExpiresAt = refreshTokenExpiry();

  const outcome = await withTransaction<RefreshOutcome>(async (client) => {
    const session = await authRepository.findSessionByTokenHashForUpdate(
      presentedHash,
      client,
    );

    // Nothing was written, so throwing here is safe - there is no state to lose.
    if (!session) {
      throw new AuthenticationError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // ── REUSE DETECTION ──
    // A revoked token was presented. Either it was stolen and replayed, or the
    // legitimate client replayed an old one. Both are indistinguishable from
    // here, and both warrant killing the entire session family: the attacker's
    // rotated token dies with it.
    if (session.revokedAt) {
      const revokedSessions = await authRepository.revokeAllSessions(
        session.adminId,
        client,
      );

      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.SESSION_REUSE_DETECTED,
          module: 'auth',
          entityType: 'admin',
          entityId: session.adminId,
          newValues: {
            compromisedSessionId: session.id,
            revokedSessions,
            ipAddress: device.ipAddress,
          },
        },
        { ...context, adminId: session.adminId },
        client,
      );

      await notificationService.queueSecurityAlert(
        session.adminId,
        {
          title: 'Suspicious sign-in activity',
          body: 'A previously used session token was replayed. All sessions were signed out.',
        },
        client,
      );

      // Return, do not throw: this transaction MUST commit.
      return {
        kind: 'reuse',
        adminId: session.adminId,
        sessionId: session.id,
        revokedSessions,
      };
    }

    if (session.expiresAt <= new Date()) {
      throw new AuthenticationError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }

    const admin = await adminRepository.findById(session.adminId, client);
    if (!admin) {
      throw new AuthenticationError('Account no longer exists', 'ACCOUNT_NOT_FOUND');
    }

    if (admin.status !== 'ACTIVE') {
      // Same hazard as the reuse branch: this revocation must survive.
      await authRepository.revokeAllSessions(admin.id, client);
      return { kind: 'inactive', adminId: admin.id, status: admin.status };
    }

    // Rotate: create the replacement first so the old row can point at it.
    const newSession = await authRepository.createSession(
      {
        adminId: admin.id,
        refreshTokenHash: hashRefreshToken(newRawToken),
        deviceName: session.deviceName,
        userAgent: device.userAgent ?? session.userAgent,
        ipAddress: device.ipAddress ?? session.ipAddress,
        expiresAt: newExpiresAt,
      },
      client,
    );

    await authRepository.revokeSession(session.id, newSession.id, client);

    /*
     * Recorded so a silent refresh is visible in the audit trail.
     *
     * Without this, the log shows a run of ADMIN_LOGIN rows and nothing else,
     * which reads identically whether refresh is working perfectly or failing
     * every time and forcing the admin to sign in again - the two cases are
     * impossible to tell apart, which is exactly when you most need the log.
     */
    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ADMIN_TOKEN_REFRESHED,
        module: 'auth',
        entityType: 'admin_session',
        entityId: newSession.id,
        newValues: { replacedSessionId: session.id, ipAddress: device.ipAddress },
      },
      { ...context, adminId: admin.id },
      client,
    );

    const roles = await permissionRepository.findRoleNamesForAdmin(admin.id, client);
    const { token: accessToken, expiresIn } = signAccessToken({
      adminId: admin.id,
      sessionId: newSession.id,
      email: admin.email,
      roles,
    });

    return {
      kind: 'rotated',
      tokens: {
        accessToken,
        expiresIn,
        refreshToken: newRawToken,
        refreshExpiresAt: newExpiresAt,
        sessionId: newSession.id,
      },
    };
  });

  // ── post-commit ──
  // The revocation is now durable; only here is it safe to reject the caller.

  if (outcome.kind === 'reuse') {
    permissionService.invalidateAdmin(outcome.adminId);
    logger.warn('Refresh token reuse detected - all sessions revoked', {
      requestId: context.requestId,
      adminId: outcome.adminId,
      sessionId: outcome.sessionId,
      revokedSessions: outcome.revokedSessions,
      ip: device.ipAddress,
    });
    throw new AuthenticationError(
      'Session invalidated. Please sign in again.',
      'SESSION_REVOKED',
    );
  }

  if (outcome.kind === 'inactive') {
    permissionService.invalidateAdmin(outcome.adminId);
    throw new AuthenticationError(
      `Your account is ${outcome.status.toLowerCase()}.`,
      'ACCOUNT_NOT_ACTIVE',
    );
  }

  return outcome.tokens;
};

// ── logout ─────────────────────────────────────────────────────────────────

export const logout = async (
  rawRefreshToken: string | undefined,
  sessionId: string | undefined,
  context: RequestContext,
): Promise<void> => {
  // Prefer the presented refresh token; fall back to the access token's sid.
  let targetId: string | undefined = sessionId;
  if (rawRefreshToken) {
    const session = await authRepository.findSessionByTokenHash(
      hashRefreshToken(rawRefreshToken),
    );
    targetId = session?.id ?? sessionId;
  }

  // Logout is idempotent - an unknown or already-revoked session is a success,
  // not a 404. The client's intent is satisfied either way.
  if (!targetId) return;

  await authRepository.revokeSession(targetId, null);

  await auditLogService.record(
    {
      action: AUDIT_ACTIONS.ADMIN_LOGOUT,
      module: 'auth',
      entityType: 'admin',
      entityId: context.adminId ?? undefined,
      newValues: { sessionId: targetId },
    },
    context,
  );
};

export const logoutAllDevices = async (
  adminId: string,
  context: RequestContext,
): Promise<{ revoked: number }> => {
  const revoked = await withTransaction(async (client) => {
    const count = await authRepository.revokeAllSessions(adminId, client);
    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ADMIN_LOGOUT_ALL,
        module: 'auth',
        entityType: 'admin',
        entityId: adminId,
        newValues: { revokedSessions: count },
      },
      context,
      client,
    );
    return count;
  });

  permissionService.invalidateAdmin(adminId);
  return { revoked };
};

export const listSessions = async (
  adminId: string,
  currentSessionId?: string,
): Promise<SessionDto[]> => {
  const sessions = await authRepository.listActiveSessions(adminId);
  return sessions.map((session) => toSessionDto(session, currentSessionId));
};

export const revokeSession = async (
  adminId: string,
  sessionId: string,
  context: RequestContext,
): Promise<void> => {
  const session = await authRepository.findSessionById(sessionId);
  if (!session) throw new NotFoundError('Session');

  // An admin may only revoke their OWN sessions through this endpoint.
  // Revoking someone else's is a status change, gated by admins.update.
  // 404 rather than 403 avoids confirming that the session exists.
  if (session.adminId !== adminId) throw new NotFoundError('Session');

  await authRepository.revokeSession(sessionId, null);
  await auditLogService.record(
    {
      action: AUDIT_ACTIONS.ADMIN_LOGOUT,
      module: 'auth',
      entityType: 'admin',
      entityId: adminId,
      newValues: { sessionId, revokedByOwner: true },
    },
    context,
  );
};

// ── password reset ─────────────────────────────────────────────────────────

/**
 * Always resolves, whether or not the email exists.
 *
 * Returning 404 for an unknown email turns this endpoint into a free user
 * directory. The controller responds 202 unconditionally; only the email send
 * differs.
 */
export const forgotPassword = async (
  email: string,
  context: RequestContext,
): Promise<void> => {
  const admin = await adminRepository.findByEmail(email);

  if (!admin || admin.status !== 'ACTIVE') {
    logger.info('Password reset requested for unknown or inactive account', {
      requestId: context.requestId,
      email,
    });
    return;
  }

  const rawToken = generateSecureToken(32);
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + env.passwordResetTtlMinutes * 60_000);

  await withTransaction(async (client) => {
    // Issuing a new link invalidates any outstanding ones.
    await authRepository.invalidateOutstandingResetTokens(admin.id, client);
    await authRepository.createPasswordResetToken(admin.id, tokenHash, expiresAt, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
        module: 'auth',
        entityType: 'admin',
        entityId: admin.id,
        // The token itself is never recorded.
        newValues: { expiresAt: expiresAt.toISOString() },
      },
      { ...context, adminId: admin.id },
      client,
    );
  });

  // Outside the transaction: an email provider timeout must not roll back a
  // token that may already have been delivered.
  void notificationService.queuePasswordResetEmail(admin.email, rawToken, expiresAt);
};

export const resetPassword = async (
  input: ResetPasswordDto,
  context: RequestContext,
): Promise<void> => {
  const tokenHash = sha256(input.token);
  const passwordHash = await hashPassword(input.password);

  const adminId = await withTransaction(async (client) => {
    const consumed = await authRepository.consumePasswordResetToken(tokenHash, client);
    if (!consumed) {
      throw new AuthenticationError(
        'This reset link is invalid or has expired',
        'INVALID_RESET_TOKEN',
      );
    }

    const admin = await adminRepository.findById(consumed.adminId, client);
    if (!admin) throw new AuthenticationError('Account no longer exists', 'ACCOUNT_NOT_FOUND');
    if (admin.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is not active', 'ACCOUNT_NOT_ACTIVE');
    }

    await adminRepository.updatePasswordHash(admin.id, passwordHash, client);

    // A reset means the password may have been compromised - every existing
    // session dies, with no exception for the "current" one.
    const revoked = await authRepository.revokeAllSessions(admin.id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
        module: 'auth',
        entityType: 'admin',
        entityId: admin.id,
        newValues: { revokedSessions: revoked, password: '[REDACTED]' },
      },
      { ...context, adminId: admin.id },
      client,
    );

    return admin.id;
  });

  permissionService.invalidateAdmin(adminId);
};

export const changePassword = async (
  adminId: string,
  currentSessionId: string | undefined,
  input: ChangePasswordDto,
  context: RequestContext,
): Promise<{ revokedSessions: number }> => {
  const admin = await adminRepository.findByIdWithPassword(adminId);
  if (!admin) throw new NotFoundError('Admin');

  const currentMatches = await verifyPassword(input.currentPassword, admin.passwordHash);
  if (!currentMatches) {
    throw new AuthenticationError('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  const reusingPassword = await verifyPassword(input.newPassword, admin.passwordHash);
  if (reusingPassword) {
    throw new ConflictError(
      'New password must differ from the current password',
      'PASSWORD_UNCHANGED',
    );
  }

  const passwordHash = await hashPassword(input.newPassword);

  return withTransaction(async (client) => {
    await adminRepository.updatePasswordHash(adminId, passwordHash, client);

    // Unlike a reset, a voluntary change keeps the current device signed in.
    const revokedSessions = currentSessionId
      ? await authRepository.revokeAllSessionsExcept(adminId, currentSessionId, client)
      : await authRepository.revokeAllSessions(adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        module: 'auth',
        entityType: 'admin',
        entityId: adminId,
        newValues: { revokedSessions, password: '[REDACTED]' },
      },
      context,
      client,
    );

    return { revokedSessions };
  });
};
