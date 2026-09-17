// src/modules/admins/services/admin.service.ts

import { PoolClient } from 'pg';
import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS, SYSTEM_ROLES } from '../../../config/constants';
import { AuthorizationError } from '../../../core/errors/AuthorizationError';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import { hashPassword } from '../../../core/utils/password';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { diffSnapshots } from '../../audit-logs/services/audit-log.service';
import * as authRepository from '../../auth/repositories/auth.repository';
import * as permissionRepository from '../../permissions/repositories/permission.repository';
import * as permissionService from '../../permissions/services/permission.service';
import * as adminRepository from '../repositories/admin.repository';
import {
  AdminDetailDto,
  AdminDto,
  AdminListItemDto,
  CreateAdminDto,
  ReplaceAdminRolesDto,
  toAdminDetailDto,
  toAdminDto,
  toAdminListItemDto,
  UpdateAdminDto,
  UpdateAdminStatusDto,
} from '../types/admin.dto';
import { AdminFilters } from '../types/admin.types';

// ── guards ─────────────────────────────────────────────────────────────────

const assertRolesExist = async (roleIds: string[]): Promise<void> => {
  const existing = await adminRepository.findExistingRoleIds(roleIds);
  const missing = roleIds.filter((id) => !existing.includes(id));
  if (missing.length > 0) {
    throw new ValidationError('One or more roles do not exist', [
      {
        field: 'roleIds',
        message: `Unknown role ids: ${missing.join(', ')}`,
        code: 'UNKNOWN_ROLE',
      },
    ]);
  }
};

/**
 * PRIVILEGE ESCALATION GUARD.
 *
 * Without this, `admins.update` is equivalent to full ADMIN: any admin
 * who can edit an admin could grant themselves (or a confederate) the
 * unrestricted role.
 *
 * A non-ADMIN may assign only roles they themselves hold, and may never
 * assign ADMIN.
 */
const assertMayAssignRoles = async (
  roleIds: string[],
  context: RequestContext,
): Promise<void> => {
  if (context.hasFullAccess) return;

  const requestedNames = await adminRepository.findRoleNamesByIds(roleIds);

  if (requestedNames.includes(SYSTEM_ROLES.ADMIN)) {
    throw new AuthorizationError(
      'Only an ADMIN may grant the ADMIN role',
      'ADMIN_GRANT_FORBIDDEN',
    );
  }

  const notHeld = requestedNames.filter((name) => !context.roles.includes(name));
  if (notHeld.length > 0) {
    throw new AuthorizationError(
      'You cannot assign a role you do not hold',
      'ROLE_ASSIGNMENT_FORBIDDEN',
      { roles: notHeld },
    );
  }
};

/** Must be called INSIDE the transaction that performs the change. */
const assertNotLastRootAdmin = async (
  targetAdminId: string,
  client: PoolClient,
): Promise<void> => {
  const targetRoles = await permissionRepository.findRoleNamesForAdmin(
    targetAdminId,
    client,
  );
  if (!targetRoles.includes(SYSTEM_ROLES.ADMIN)) return;

  const remaining = await adminRepository.countActiveAdminsWithRoleForUpdate(
    SYSTEM_ROLES.ADMIN,
    client,
  );
  if (remaining <= 1) {
    throw new ConflictError(
      'Cannot remove, suspend, or delete the last active ADMIN',
      'LAST_ADMIN',
    );
  }
};

// ── operations ─────────────────────────────────────────────────────────────

export const list = async (
  filters: AdminFilters,
  pagination: PaginationParams,
): Promise<{ rows: AdminListItemDto[]; meta: PaginationMeta }> => {
  const { rows, total } = await adminRepository.findAll(filters, pagination);
  return {
    rows: rows.map(toAdminListItemDto),
    meta: buildPaginationMeta(total, pagination),
  };
};

export const getById = async (id: string): Promise<AdminDetailDto> => {
  const admin = await adminRepository.findDetailById(id);
  if (!admin) throw new NotFoundError('Admin');
  const permissions = await permissionRepository.findPermissionKeysForAdmin(id);
  return toAdminDetailDto(admin, permissions);
};

export const create = async (
  input: CreateAdminDto,
  context: RequestContext,
): Promise<AdminDto> => {
  await assertRolesExist(input.roleIds);
  await assertMayAssignRoles(input.roleIds, context);

  // Cheap pre-check for a friendly error. The partial unique index
  // admins_email_unique_live is the real guarantee - this check races, the
  // index does not.
  if (await adminRepository.existsByEmail(input.email)) {
    throw new ConflictError('An admin with this email already exists', 'EMAIL_TAKEN');
  }

  // Hash BEFORE opening the transaction: bcrypt at cost 12 takes ~150ms and
  // must not hold a pool connection for that long.
  const passwordHash = await hashPassword(input.password);

  const created = await withTransaction(async (client) => {
    const admin = await adminRepository.create(
      {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash,
        status: input.status,
      },
      client,
    );

    await adminRepository.assignRoles(admin.id, input.roleIds, context.adminId, client);
    const roleNames = await permissionRepository.findRoleNamesForAdmin(admin.id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ADMIN_CREATED,
        module: 'admins',
        entityType: 'admin',
        entityId: admin.id,
        newValues: {
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          status: admin.status,
          roles: roleNames,
          // The password is never referenced here.
        },
      },
      context,
      client,
    );

    return admin;
  });

  return toAdminDto(created);
};

export const update = async (
  id: string,
  input: UpdateAdminDto,
  context: RequestContext,
): Promise<AdminDto> =>
  withTransaction(async (client) => {
    const existing = await adminRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Admin');

    if (input.email && input.email !== existing.email) {
      if (await adminRepository.existsByEmail(input.email, id, client)) {
        throw new ConflictError('An admin with this email already exists', 'EMAIL_TAKEN');
      }
    }

    const updated = await adminRepository.update(id, input, client);
    if (!updated) throw new NotFoundError('Admin');

    const { oldValues, newValues } = diffSnapshots(
      existing as unknown as Record<string, unknown>,
      input as Record<string, unknown>,
    );

    // Nothing actually changed - skip the audit row rather than record a no-op.
    if (Object.keys(newValues).length > 0) {
      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.ADMIN_UPDATED,
          module: 'admins',
          entityType: 'admin',
          entityId: id,
          oldValues,
          newValues,
        },
        context,
        client,
      );
    }

    return toAdminDto(updated);
  });

export const changeStatus = async (
  id: string,
  input: UpdateAdminStatusDto,
  context: RequestContext,
): Promise<AdminDto> => {
  if (id === context.adminId) {
    throw new ConflictError('You cannot change your own status', 'SELF_STATUS_CHANGE');
  }

  const updated = await withTransaction(async (client) => {
    const existing = await adminRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Admin');
    if (existing.status === input.status) {
      throw new ConflictError(`Admin is already ${input.status}`, 'STATUS_UNCHANGED');
    }

    // Deactivating an ADMIN carries the same risk as deleting one.
    if (input.status !== 'ACTIVE') {
      await assertNotLastRootAdmin(id, client);
    }

    const admin = await adminRepository.updateStatus(id, input.status, client);
    if (!admin) throw new NotFoundError('Admin');

    // A non-ACTIVE admin must lose every live session immediately - otherwise
    // their existing access token stays valid for up to 15 minutes.
    let revokedSessions = 0;
    if (input.status !== 'ACTIVE') {
      revokedSessions = await authRepository.revokeAllSessions(id, client);
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ADMIN_STATUS_CHANGED,
        module: 'admins',
        entityType: 'admin',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: input.status, reason: input.reason ?? null, revokedSessions },
      },
      context,
      client,
    );

    return admin;
  });

  // After commit: the cached entry now describes a stale status.
  permissionService.invalidateAdmin(id);
  return toAdminDto(updated);
};

export const replaceRoles = async (
  id: string,
  input: ReplaceAdminRolesDto,
  context: RequestContext,
): Promise<AdminDetailDto> => {
  await assertRolesExist(input.roleIds);
  await assertMayAssignRoles(input.roleIds, context);

  await withTransaction(async (client) => {
    const existing = await adminRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Admin');

    const previousRoles = await permissionRepository.findRoleNamesForAdmin(id, client);
    const nextRoleNames = await adminRepository.findRoleNamesByIds(input.roleIds, client);

    // Removing ADMIN from the last holder is the escalation-inverse hazard.
    const losingRootRole =
      previousRoles.includes(SYSTEM_ROLES.ADMIN) &&
      !nextRoleNames.includes(SYSTEM_ROLES.ADMIN);
    if (losingRootRole) {
      await assertNotLastRootAdmin(id, client);
    }

    await adminRepository.removeAllRoles(id, client);
    await adminRepository.assignRoles(id, input.roleIds, context.adminId, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ADMIN_ROLES_CHANGED,
        module: 'admins',
        entityType: 'admin',
        entityId: id,
        oldValues: { roles: previousRoles },
        newValues: { roles: nextRoleNames },
      },
      context,
      client,
    );
  });

  permissionService.invalidateAdmin(id);
  return getById(id);
};

export const softDelete = async (
  id: string,
  context: RequestContext,
): Promise<void> => {
  if (id === context.adminId) {
    throw new ConflictError('You cannot delete your own account', 'SELF_DELETE');
  }

  await withTransaction(async (client) => {
    const existing = await adminRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Admin');

    await assertNotLastRootAdmin(id, client);

    await adminRepository.softDelete(id, client);
    const revokedSessions = await authRepository.revokeAllSessions(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ADMIN_DELETED,
        module: 'admins',
        entityType: 'admin',
        entityId: id,
        oldValues: {
          firstName: existing.firstName,
          lastName: existing.lastName,
          email: existing.email,
          status: existing.status,
        },
        newValues: { revokedSessions },
      },
      context,
      client,
    );
  });

  permissionService.invalidateAdmin(id);
};
