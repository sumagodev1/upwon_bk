// src/modules/files/repositories/file.repository.ts

import { Executor, runQuery } from '../../../config/database';
import { StorageProviderName } from '../../../config/constants';
import { PaginatedResult, PaginationParams } from '../../../core/types/common.types';
import { SqlBuilder } from '../../../core/utils/query-builder';
import { CreateFileRecordInput, FileFilters, FileRecord } from '../types/file.types';

interface FileRow {
  id: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  provider: string;
  entity_type: string | null;
  entity_id: string | null;
  uploaded_by: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

const toFileRecord = (row: FileRow): FileRecord => ({
  id: row.id,
  storageKey: row.storage_key,
  originalName: row.original_name,
  mimeType: row.mime_type,
  sizeBytes: Number(row.size_bytes),
  provider: row.provider as StorageProviderName,
  entityType: row.entity_type,
  entityId: row.entity_id,
  uploadedBy: row.uploaded_by,
  createdAt: row.created_at,
  deletedAt: row.deleted_at,
});

const COLUMNS = `
  f.id, f.storage_key, f.original_name, f.mime_type, f.size_bytes, f.provider,
  f.entity_type, f.entity_id, f.uploaded_by, f.created_at, f.deleted_at
`;

export const create = async (
  input: CreateFileRecordInput,
  executor?: Executor,
): Promise<FileRecord> => {
  const sql = `
    INSERT INTO files
      (storage_key, original_name, mime_type, size_bytes, provider,
       entity_type, entity_id, uploaded_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, storage_key, original_name, mime_type, size_bytes, provider,
              entity_type, entity_id, uploaded_by, created_at, deleted_at
  `;
  const result = await runQuery<FileRow>(executor, sql, [
    input.storageKey,
    input.originalName,
    input.mimeType,
    input.sizeBytes,
    input.provider,
    input.entityType,
    input.entityId,
    input.uploadedBy,
  ]);
  return toFileRecord(result.rows[0]);
};

export const findById = async (
  id: string,
  executor?: Executor,
): Promise<FileRecord | null> => {
  const sql = `SELECT ${COLUMNS} FROM files f WHERE f.id = $1 AND f.deleted_at IS NULL`;
  const result = await runQuery<FileRow>(executor, sql, [id]);
  return result.rows[0] ? toFileRecord(result.rows[0]) : null;
};

export const findByStorageKey = async (
  storageKey: string,
  executor?: Executor,
): Promise<FileRecord | null> => {
  const sql = `
    SELECT ${COLUMNS} FROM files f
     WHERE f.storage_key = $1 AND f.deleted_at IS NULL
  `;
  const result = await runQuery<FileRow>(executor, sql, [storageKey]);
  return result.rows[0] ? toFileRecord(result.rows[0]) : null;
};

export const findAll = async (
  filters: FileFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<FileRecord>> => {
  const builder = new SqlBuilder();
  builder.raw('f.deleted_at IS NULL');
  builder.whereIf(filters.entityType, {
    column: 'f.entity_type',
    operator: '=',
    value: filters.entityType,
  });
  builder.whereIf(filters.entityId, {
    column: 'f.entity_id',
    operator: '=',
    value: filters.entityId,
  });
  builder.whereIf(filters.uploadedBy, {
    column: 'f.uploaded_by',
    operator: '=',
    value: filters.uploadedBy,
  });
  if (pagination.search) {
    builder.raw('f.original_name ILIKE ?', `%${pagination.search}%`);
  }

  const whereClause = builder.buildWhere();
  const limitClause = builder.buildLimitOffset(pagination.limit, pagination.offset);

  const sql = `
    SELECT ${COLUMNS}, COUNT(*) OVER() AS total_count
      FROM files f
    ${whereClause}
     ORDER BY f.created_at DESC, f.id DESC
    ${limitClause}
  `;
  const result = await runQuery<FileRow & { total_count: number }>(
    undefined,
    sql,
    builder.getValues(),
  );
  return {
    rows: result.rows.map(toFileRecord),
    total: result.rows.length > 0 ? Number(result.rows[0].total_count) : 0,
  };
};

export const softDelete = async (
  id: string,
  executor?: Executor,
): Promise<boolean> => {
  const sql = `UPDATE files SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`;
  const result = await runQuery(executor, sql, [id]);
  return (result.rowCount ?? 0) > 0;
};
