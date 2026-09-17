// src/modules/files/validators/file.validator.ts

import { PaginationParams } from '../../../core/types/common.types';
import { parsePagination } from '../../../core/utils/pagination';
import { validator } from '../../../core/utils/validation';
import { FileFilters } from '../types/file.types';

export function validateFileListQuery(query: Record<string, unknown>): {
  filters: FileFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);
  const filters: FileFilters = {
    entityType: v.optionalString('entityType', { max: 50 }),
    entityId: v.optionalString('entityId', { max: 64 }),
    uploadedBy: v.optionalUuid('uploadedBy'),
  };
  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateUploadMetadata(body: unknown): {
  entityType?: string;
  entityId?: string;
} {
  const v = validator(body);
  const dto = {
    entityType: v.optionalString('entityType', { max: 50 }),
    entityId: v.optionalString('entityId', { max: 64 }),
  };
  v.custom(
    !dto.entityId || Boolean(dto.entityType),
    'entityType',
    'entityType is required when entityId is provided',
    'REQUIRED',
  );
  v.assert();
  return dto;
}
