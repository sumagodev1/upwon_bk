// src/modules/audit-logs/services/audit-log.service.ts

import { Executor } from '../../../config/database';
import { AuditAction } from '../../../config/constants';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import { logger } from '../../../core/utils/logger';
import * as auditLogRepository from '../repositories/audit-log.repository';
import { AuditLogEntry, AuditLogFilters } from '../types/audit-log.types';

export interface AuditEntry {
  action: AuditAction;
  module: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

/**
 * Never persisted, at any nesting depth. This is the last line of defence -
 * the first is not passing these values in.
 */
const FORBIDDEN_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'tokenhash',
  'accesstoken',
  'refreshtoken',
  'refreshtokenhash',
  'secret',
  'apikey',
  'keyhash',
  'authorization',
  'cookie',
]);

const sanitize = (
  values: Record<string, unknown> | null | undefined,
  depth = 0,
): Record<string, unknown> | null => {
  if (!values || depth > 4) return null;

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase().replace(/[-_]/g, ''))) {
      // Record that the field changed without recording what it changed to.
      output[key] = '[REDACTED]';
      continue;
    }
    if (value instanceof Date) {
      output[key] = value.toISOString();
    } else if (value instanceof Set) {
      output[key] = [...value];
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = sanitize(value as Record<string, unknown>, depth + 1);
    } else {
      output[key] = value;
    }
  }
  return output;
};

/**
 * Reduces before/after snapshots to only the keys that actually changed.
 * Keeps audit rows small and makes "what changed?" answerable without a diff
 * at read time.
 */
export const diffSnapshots = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } => {
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  for (const [key, nextValue] of Object.entries(after)) {
    if (nextValue === undefined) continue;
    const previousValue = before[key];
    if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
      oldValues[key] = previousValue ?? null;
      newValues[key] = nextValue;
    }
  }

  return { oldValues, newValues };
};

/**
 * Writes an audit record.
 *
 * Pass `executor` (a transaction client) whenever the audited operation is
 * itself transactional - the record then commits or rolls back with the change
 * it describes, so there is never an audit row for a rolled-back write, nor a
 * committed write with no audit row.
 *
 * With `executor`, a failed insert propagates and aborts the operation.
 * Without it, errors are swallowed and logged: a failed audit write must not
 * turn a successful login into a 500.
 */
export const record = async (
  entry: AuditEntry,
  context: RequestContext,
  executor?: Executor,
): Promise<void> => {
  const payload = {
    adminId: context.adminId,
    action: entry.action,
    module: entry.module,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    oldValues: sanitize(entry.oldValues),
    newValues: sanitize(entry.newValues),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent?.slice(0, 1000) ?? null,
    requestId: context.requestId,
  };

  if (executor) {
    await auditLogRepository.insert(payload, executor);
    return;
  }

  try {
    await auditLogRepository.insert(payload);
  } catch (error) {
    logger.error('Audit log write failed (non-transactional)', {
      requestId: context.requestId,
      action: entry.action,
      module: entry.module,
      entityId: entry.entityId,
      message: (error as Error).message,
    });
  }
};

export const list = async (
  filters: AuditLogFilters,
  pagination: PaginationParams,
): Promise<{ rows: AuditLogEntry[]; meta: PaginationMeta }> => {
  const { rows, total } = await auditLogRepository.findAll(filters, pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: number): Promise<AuditLogEntry | null> =>
  auditLogRepository.findById(id);

export const listDistinctActions = async (): Promise<string[]> =>
  auditLogRepository.findDistinctActions();
