// src/modules/settings/repositories/setting.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { Setting } from '../types/setting.types';

interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
  is_sensitive: boolean;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toSetting = (row: SettingRow): Setting => ({
  key: row.key,
  value: row.value,
  description: row.description,
  isSensitive: row.is_sensitive,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const COLUMNS = `key, value, description, is_sensitive, updated_by, created_at, updated_at`;

export const findAll = async (executor?: Executor): Promise<Setting[]> => {
  const sql = `SELECT ${COLUMNS} FROM settings ORDER BY key ASC`;
  const result = await runQuery<SettingRow>(executor, sql, []);
  return result.rows.map(toSetting);
};

export const findByKey = async (
  key: string,
  executor?: Executor,
): Promise<Setting | null> => {
  const sql = `SELECT ${COLUMNS} FROM settings WHERE key = $1`;
  const result = await runQuery<SettingRow>(executor, sql, [key]);
  return result.rows[0] ? toSetting(result.rows[0]) : null;
};

export const findByKeys = async (
  keys: string[],
  executor?: Executor,
): Promise<Setting[]> => {
  if (keys.length === 0) return [];
  const sql = `SELECT ${COLUMNS} FROM settings WHERE key = ANY($1::text[]) ORDER BY key`;
  const result = await runQuery<SettingRow>(executor, sql, [keys]);
  return result.rows.map(toSetting);
};

/**
 * Updates an existing key only. Settings are seeded, not created through the
 * API - an unknown key is a client error, not an invitation to insert one.
 */
export const updateValue = async (
  key: string,
  value: unknown,
  updatedBy: string | null,
  executor?: Executor,
): Promise<Setting | null> => {
  const sql = `
    UPDATE settings
       SET value = $2::jsonb, updated_by = $3
     WHERE key = $1
    RETURNING ${COLUMNS}
  `;
  const result = await runQuery<SettingRow>(executor, sql, [
    key,
    JSON.stringify(value),
    updatedBy,
  ]);
  return result.rows[0] ? toSetting(result.rows[0]) : null;
};
