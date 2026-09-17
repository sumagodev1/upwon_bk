// src/modules/audit-logs/validators/audit-log.validator.ts

import { validator } from '../../../core/utils/validation';
import { parsePagination } from '../../../core/utils/pagination';
import { PaginationParams } from '../../../core/types/common.types';
import { AuditLogFilters } from '../types/audit-log.types';

export function validateAuditLogQuery(query: Record<string, unknown>): {
  filters: AuditLogFilters;
  pagination: PaginationParams;
} {
  const v = validator(query);

  const filters: AuditLogFilters = {
    adminId: v.optionalUuid('adminId'),
    action: v.optionalString('action', { max: 80 }),
    module: v.optionalString('module', { max: 50 }),
    entityType: v.optionalString('entityType', { max: 50 }),
    entityId: v.optionalString('entityId', { max: 64 }),
    dateFrom: v.optionalDate('dateFrom'),
    dateTo: v.optionalDate('dateTo'),
  };

  v.custom(
    !filters.dateFrom || !filters.dateTo || filters.dateFrom <= filters.dateTo,
    'dateFrom',
    'dateFrom must be on or before dateTo',
    'INVALID_RANGE',
  );

  v.assert();
  return { filters, pagination: parsePagination(query) };
}

export function validateAuditLogId(value: unknown): number {
  const v = validator({ id: value });
  const id = v.requiredNumber('id', { integer: true, min: 1 });
  v.assert();
  return id;
}
