// src/modules/api-keys/validators/api-key.validator.ts

import { LIMITS } from '../../../config/constants';
import { parsePagination } from '../../../core/utils/pagination';
import { PaginationParams } from '../../../core/types/common.types';
import { validator } from '../../../core/utils/validation';
import { CreateApiKeyDto } from '../types/api-key.types';

export function validateCreateApiKey(body: unknown): CreateApiKeyDto {
  const v = validator(body);
  const dto: CreateApiKeyDto = {
    name: v.requiredString('name', { min: 2, max: 120 }),
    permissionIds: v.uuidArray('permissionIds', { max: LIMITS.MAX_PERMISSIONS_PER_ROLE }),
    expiresAt: v.optionalDate('expiresAt'),
  };
  v.custom(
    dto.permissionIds.length > 0,
    'permissionIds',
    'An API key must be granted at least one scope',
    'REQUIRED',
  );
  v.custom(
    !dto.expiresAt || dto.expiresAt > new Date(),
    'expiresAt',
    'expiresAt must be in the future',
    'INVALID_DATE',
  );
  v.assert();
  return dto;
}

export function validateApiKeyListQuery(query: Record<string, unknown>): {
  pagination: PaginationParams;
} {
  return { pagination: parsePagination(query) };
}
