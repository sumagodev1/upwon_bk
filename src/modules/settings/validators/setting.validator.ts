// src/modules/settings/validators/setting.validator.ts

import { validator } from '../../../core/utils/validation';
import { UpsertSettingInput } from '../types/setting.types';

const SETTING_KEY_PATTERN = /^[a-z][a-z0-9_]{2,99}$/;

/**
 * PATCH /settings accepts a flat object of key -> value pairs, so several
 * settings can be changed atomically in one request.
 */
export function validateUpdateSettings(body: unknown): UpsertSettingInput[] {
  const v = validator(body);

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    v.custom(false, 'body', 'Request body must be an object of key/value pairs', 'INVALID_TYPE');
    v.assert();
    return [];
  }

  const entries = Object.entries(body as Record<string, unknown>);
  v.custom(entries.length > 0, 'body', 'Provide at least one setting to update', 'EMPTY_UPDATE');
  v.custom(entries.length <= 50, 'body', 'At most 50 settings per request', 'TOO_MANY');

  for (const [key] of entries) {
    v.custom(
      SETTING_KEY_PATTERN.test(key),
      key,
      'Setting keys must be lowercase letters, digits, and underscores',
      'INVALID_SETTING_KEY',
    );
  }

  v.assert();
  return entries.map(([key, value]) => ({ key, value }));
}

export function validateSettingKey(value: unknown): string {
  const v = validator({ key: value });
  const key = v.requiredString('key', { min: 3, max: 100 });
  v.custom(
    SETTING_KEY_PATTERN.test(key),
    'key',
    'Invalid setting key',
    'INVALID_SETTING_KEY',
  );
  v.assert();
  return key;
}
