// src/modules/roles/validators/role.validator.ts

import { LIMITS } from '../../../config/constants';
import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import { CreateRoleDto, ReplaceRolePermissionsDto, UpdateRoleDto } from '../types/role.types';

const ROLE_NAME_PATTERN = /^[A-Z][A-Z0-9_]{2,49}$/;

export function validateCreateRole(body: unknown): CreateRoleDto {
  const v = validator(body);
  const name = v.requiredString('name', { min: 3, max: 50 });
  v.custom(
    name === '' || ROLE_NAME_PATTERN.test(name),
    'name',
    'Role name must be uppercase letters, digits, and underscores (e.g. SUPPORT_ADMIN)',
    'INVALID_ROLE_NAME',
  );
  v.custom(
    !v.has('isSystemRole'),
    'isSystemRole',
    'System roles cannot be created through the API',
    'FORBIDDEN_FIELD',
  );

  const dto: CreateRoleDto = {
    name,
    description: v.optionalString('description', { max: 500 }) ?? null,
    permissionIds: v.uuidArray('permissionIds', { max: LIMITS.MAX_PERMISSIONS_PER_ROLE }),
  };
  v.assert();
  return dto;
}

export function validateUpdateRole(body: unknown): UpdateRoleDto {
  const v = validator(body);
  v.custom(
    !v.has('permissionIds'),
    'permissionIds',
    'Use PUT /roles/:id/permissions',
    'WRONG_ENDPOINT',
  );
  v.custom(
    !v.has('isSystemRole'),
    'isSystemRole',
    'isSystemRole cannot be changed',
    'FORBIDDEN_FIELD',
  );
  v.requireAtLeastOne(['name', 'description']);

  const name = v.has('name') ? v.requiredString('name', { min: 3, max: 50 }) : undefined;
  if (name !== undefined) {
    v.custom(
      ROLE_NAME_PATTERN.test(name),
      'name',
      'Role name must be uppercase letters, digits, and underscores',
      'INVALID_ROLE_NAME',
    );
  }

  const dto: UpdateRoleDto = {
    name,
    description: v.has('description')
      ? (v.optionalString('description', { max: 500 }) ?? null)
      : undefined,
  };
  v.assert();
  return dto;
}

export function validateReplaceRolePermissions(body: unknown): ReplaceRolePermissionsDto {
  const v = validator(body);
  const dto: ReplaceRolePermissionsDto = {
    permissionIds: v.uuidArray('permissionIds', { max: LIMITS.MAX_PERMISSIONS_PER_ROLE }),
  };
  v.assert();
  return dto;
}

export function validateRoleListQuery(query: Record<string, unknown>): {
  filters: { isSystemRole?: boolean };
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters = { isSystemRole: v.optionalBoolean('isSystemRole') };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}
