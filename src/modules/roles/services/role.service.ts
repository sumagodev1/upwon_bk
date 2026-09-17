// src/modules/roles/services/role.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { ConflictError } from '../../../core/errors/ConflictError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import { diffSnapshots } from '../../audit-logs/services/audit-log.service';
import * as permissionRepository from '../../permissions/repositories/permission.repository';
import * as permissionService from '../../permissions/services/permission.service';
import * as roleRepository from '../repositories/role.repository';
import {
  CreateRoleDto,
  ReplaceRolePermissionsDto,
  Role,
  RoleWithPermissions,
  UpdateRoleDto,
} from '../types/role.types';

const assertPermissionsExist = async (permissionIds: string[]): Promise<void> => {
  if (permissionIds.length === 0) return;
  const existing = await permissionRepository.findExistingIds(permissionIds);
  const missing = permissionIds.filter((id) => !existing.includes(id));
  if (missing.length > 0) {
    throw new ValidationError('One or more permissions do not exist', [
      {
        field: 'permissionIds',
        message: `Unknown permission ids: ${missing.join(', ')}`,
        code: 'UNKNOWN_PERMISSION',
      },
    ]);
  }
};

export const list = async (
  filters: { isSystemRole?: boolean },
  pagination: PaginationParams,
): Promise<{ rows: RoleWithPermissions[]; meta: PaginationMeta }> => {
  const { rows, total } = await roleRepository.findAll(pagination, filters);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<RoleWithPermissions> => {
  const role = await roleRepository.findDetailById(id);
  if (!role) throw new NotFoundError('Role');
  return role;
};

export const create = async (
  input: CreateRoleDto,
  context: RequestContext,
): Promise<RoleWithPermissions> => {
  await assertPermissionsExist(input.permissionIds);

  const created = await withTransaction(async (client) => {
    const role = await roleRepository.create(
      { name: input.name, description: input.description, isSystemRole: false },
      client,
    );

    await roleRepository.replacePermissions(role.id, input.permissionIds, client);
    const grantedKeys = await permissionRepository.findKeysByIds(
      input.permissionIds,
      client,
    );

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ROLE_CREATED,
        module: 'roles',
        entityType: 'role',
        entityId: role.id,
        newValues: {
          name: role.name,
          description: role.description,
          permissions: grantedKeys,
        },
      },
      context,
      client,
    );

    return role;
  });

  return getById(created.id);
};

export const update = async (
  id: string,
  input: UpdateRoleDto,
  context: RequestContext,
): Promise<Role> =>
  withTransaction(async (client) => {
    const existing = await roleRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Role');

    // System roles are referenced by name in code (the ADMIN
    // short-circuit, seed data, the last-ADMIN guard). Renaming one
    // would silently break every one of those.
    if (existing.isSystemRole && input.name && input.name !== existing.name) {
      throw new ConflictError('System roles cannot be renamed', 'SYSTEM_ROLE_IMMUTABLE');
    }

    const role = await roleRepository.update(id, input, client);
    if (!role) throw new NotFoundError('Role');

    const { oldValues, newValues } = diffSnapshots(
      existing as unknown as Record<string, unknown>,
      input as Record<string, unknown>,
    );

    if (Object.keys(newValues).length > 0) {
      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.ROLE_UPDATED,
          module: 'roles',
          entityType: 'role',
          entityId: id,
          oldValues,
          newValues,
        },
        context,
        client,
      );
    }

    return role;
  });

export const replacePermissions = async (
  id: string,
  input: ReplaceRolePermissionsDto,
  context: RequestContext,
): Promise<RoleWithPermissions> => {
  await assertPermissionsExist(input.permissionIds);

  await withTransaction(async (client) => {
    const existing = await roleRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Role');

    const previous = await permissionRepository.findPermissionsForRole(id, client);
    const previousKeys = previous.map((permission) => permission.key);

    await roleRepository.replacePermissions(id, input.permissionIds, client);

    const nextKeys = await permissionRepository.findKeysByIds(input.permissionIds, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ROLE_PERMISSIONS_CHANGED,
        module: 'roles',
        entityType: 'role',
        entityId: id,
        oldValues: { permissions: previousKeys },
        newValues: { permissions: nextKeys },
      },
      context,
      client,
    );
  });

  // Blast radius is every admin holding this role. Clearing the whole cache is
  // both correct and inexpensive - it repopulates per admin on the next request.
  permissionService.invalidateEveryone();

  return getById(id);
};

export const remove = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await roleRepository.findByIdForUpdate(id, client);
    if (!existing) throw new NotFoundError('Role');

    if (existing.isSystemRole) {
      throw new ConflictError('System roles cannot be deleted', 'SYSTEM_ROLE_IMMUTABLE');
    }

    const adminCount = await roleRepository.countAdminsWithRole(id, client);
    if (adminCount > 0) {
      throw new ConflictError(
        'Cannot delete a role that is still assigned to admins',
        'ROLE_IN_USE',
        { adminCount },
      );
    }

    await roleRepository.deleteById(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.ROLE_DELETED,
        module: 'roles',
        entityType: 'role',
        entityId: id,
        oldValues: { name: existing.name, description: existing.description },
      },
      context,
      client,
    );
  });

  permissionService.invalidateEveryone();
};
