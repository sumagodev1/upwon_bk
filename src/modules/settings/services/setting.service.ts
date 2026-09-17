// src/modules/settings/services/setting.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { AuthorizationError } from '../../../core/errors/AuthorizationError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { RequestContext } from '../../../core/types/common.types';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as settingRepository from '../repositories/setting.repository';
import { Setting, UpsertSettingInput } from '../types/setting.types';

/** Sensitive values are masked on read for everyone except an ADMIN. */
const maskIfSensitive = (setting: Setting, hasFullAccess: boolean): Setting => {
  if (!setting.isSensitive || hasFullAccess) return setting;
  return { ...setting, value: '[REDACTED]' };
};

export const list = async (context: RequestContext): Promise<Setting[]> => {
  const settings = await settingRepository.findAll();
  return settings.map((setting) => maskIfSensitive(setting, context.hasFullAccess));
};

export const getByKey = async (
  key: string,
  context: RequestContext,
): Promise<Setting> => {
  const setting = await settingRepository.findByKey(key);
  if (!setting) throw new NotFoundError('Setting');
  return maskIfSensitive(setting, context.hasFullAccess);
};

/**
 * Applies every change in one transaction, so a request touching several
 * settings is all-or-nothing.
 */
export const updateMany = async (
  updates: UpsertSettingInput[],
  context: RequestContext,
): Promise<Setting[]> => {
  const keys = updates.map((update) => update.key);

  // Settings are seeded, not created through the API. Reject unknown keys
  // before writing anything.
  const existing = await settingRepository.findByKeys(keys);
  const existingByKey = new Map(existing.map((setting) => [setting.key, setting]));
  const missing = keys.filter((key) => !existingByKey.has(key));
  if (missing.length > 0) {
    throw new ValidationError('One or more settings do not exist', [
      {
        field: 'body',
        message: `Unknown setting keys: ${missing.join(', ')}`,
        code: 'UNKNOWN_SETTING',
      },
    ]);
  }

  // Only an ADMIN may change a setting flagged is_sensitive. The
  // endpoint-level guard (settings.update) is not enough - the rule is
  // per-key, and only the service can see which keys are sensitive.
  const sensitiveKeys = updates
    .map((update) => existingByKey.get(update.key)!)
    .filter((setting) => setting.isSensitive)
    .map((setting) => setting.key);

  if (sensitiveKeys.length > 0 && !context.hasFullAccess) {
    throw new AuthorizationError(
      'Only an ADMIN may modify sensitive settings',
      'SENSITIVE_SETTING_FORBIDDEN',
      { keys: sensitiveKeys },
    );
  }

  return withTransaction(async (client) => {
    const results: Setting[] = [];
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const update of updates) {
      const before = existingByKey.get(update.key)!;
      const updated = await settingRepository.updateValue(
        update.key,
        update.value,
        context.adminId,
        client,
      );
      if (!updated) throw new NotFoundError(`Setting ${update.key}`);

      // The value of a sensitive setting is never written to the audit trail -
      // only the fact that it changed.
      oldValues[update.key] = before.isSensitive ? '[REDACTED]' : before.value;
      newValues[update.key] = updated.isSensitive ? '[REDACTED]' : updated.value;

      results.push(updated);
    }

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.SETTINGS_UPDATED,
        module: 'settings',
        entityType: 'setting',
        entityId: keys.join(','),
        oldValues,
        newValues,
      },
      context,
      client,
    );

    return results.map((setting) => maskIfSensitive(setting, context.hasFullAccess));
  });
};

/** Internal read for other services - never masked, never exposed directly. */
export const getValue = async <T>(key: string, fallback: T): Promise<T> => {
  const setting = await settingRepository.findByKey(key);
  return setting ? (setting.value as T) : fallback;
};
