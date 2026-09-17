// src/modules/admins/validators/admin.validator.ts

import { ADMIN_STATUSES, LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import {
  CreateAdminDto,
  ReplaceAdminRolesDto,
  UpdateAdminDto,
  UpdateAdminStatusDto,
} from '../types/admin.dto';
import { AdminFilters } from '../types/admin.types';

export function validateCreateAdmin(body: unknown): CreateAdminDto {
  const v = validator(body);
  const dto: CreateAdminDto = {
    firstName: v.requiredString('firstName', { min: 1, max: 100 }),
    lastName: v.requiredString('lastName', { min: 1, max: 100 }),
    email: v.requiredEmail('email'),
    password: v.password('password'),
    status: v.optionalEnum('status', ADMIN_STATUSES) ?? 'ACTIVE',
    roleIds: v.uuidArray('roleIds', { max: LIMITS.MAX_ROLES_PER_ADMIN }),
  };
  v.custom(dto.roleIds.length > 0, 'roleIds', 'At least one role is required', 'REQUIRED');
  v.assert();
  return dto;
}

export function validateUpdateAdmin(body: unknown): UpdateAdminDto {
  const v = validator(body);

  // These have dedicated endpoints with their own permissions and audit actions.
  v.custom(!v.has('status'), 'status', 'Use PATCH /admins/:id/status', 'WRONG_ENDPOINT');
  v.custom(!v.has('roleIds'), 'roleIds', 'Use PUT /admins/:id/roles', 'WRONG_ENDPOINT');
  v.custom(
    !v.has('password'),
    'password',
    'Use POST /auth/change-password or the password reset flow',
    'WRONG_ENDPOINT',
  );

  v.requireAtLeastOne(['firstName', 'lastName', 'email']);

  const dto: UpdateAdminDto = {
    firstName: v.optionalString('firstName', { min: 1, max: 100 }),
    lastName: v.optionalString('lastName', { min: 1, max: 100 }),
    email: v.optionalEmail('email'),
  };
  v.assert();
  return dto;
}

export function validateUpdateAdminStatus(body: unknown): UpdateAdminStatusDto {
  const v = validator(body);
  const dto: UpdateAdminStatusDto = {
    status: v.requiredEnum('status', ADMIN_STATUSES),
    reason: v.optionalString('reason', { max: 500 }),
  };
  v.assert();
  return dto;
}

export function validateReplaceAdminRoles(body: unknown): ReplaceAdminRolesDto {
  const v = validator(body);
  const dto: ReplaceAdminRolesDto = {
    roleIds: v.uuidArray('roleIds', { max: LIMITS.MAX_ROLES_PER_ADMIN }),
  };
  v.custom(dto.roleIds.length > 0, 'roleIds', 'At least one role is required', 'REQUIRED');
  v.assert();
  return dto;
}

export function validateAdminListQuery(query: Record<string, unknown>): {
  filters: AdminFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: AdminFilters = {
    status: v.optionalEnum('status', ADMIN_STATUSES),
    roleId: v.optionalUuid('roleId'),
    createdFrom: v.optionalDate('createdFrom'),
    createdTo: v.optionalDate('createdTo'),
  };
  v.custom(
    !filters.createdFrom || !filters.createdTo || filters.createdFrom <= filters.createdTo,
    'createdFrom',
    'createdFrom must be on or before createdTo',
    'INVALID_RANGE',
  );
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
