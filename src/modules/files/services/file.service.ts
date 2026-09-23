// src/modules/files/services/file.service.ts

import { withTransaction } from '../../../config/database';
import {
  AUDIT_ACTIONS,
  isPubliclyServableEntityType,
  isPubliclyServableMimeType,
} from '../../../config/constants';
import { env } from '../../../config/env';
import { AppError } from '../../../core/errors/AppError';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import { logger } from '../../../core/utils/logger';
import { getStorageProvider } from '../../../storage/storage.factory';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as fileRepository from '../repositories/file.repository';
import { FileFilters, FileRecord } from '../types/file.types';

/**
 * Allowlist, not a denylist. Anything not listed is rejected - the set of
 * dangerous types is unbounded, the set of types this panel needs is small.
 */
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  // Video, for the home page's product-intro sections. Two codecs rather than
  // every container ffmpeg knows: these are the pair every current browser
  // plays natively, so anything else would upload fine and then not play.
  'video/mp4',
  'video/webm',
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export interface UploadFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  entityType?: string;
  entityId?: string;
}

const storage = getStorageProvider();

export const list = async (
  filters: FileFilters,
  pagination: PaginationParams,
): Promise<{ rows: Array<FileRecord & { url: string }>; meta: PaginationMeta }> => {
  const { rows, total } = await fileRepository.findAll(filters, pagination);
  const withUrls = await Promise.all(
    rows.map(async (file) => ({
      ...file,
      url: await storage.getPublicUrl(file.storageKey),
    })),
  );
  return { rows: withUrls, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<FileRecord & { url: string }> => {
  const file = await fileRepository.findById(id);
  if (!file) throw new NotFoundError('File');
  return { ...file, url: await storage.getPublicUrl(file.storageKey) };
};

export const download = async (
  id: string,
): Promise<{ file: FileRecord; buffer: Buffer }> => {
  const file = await fileRepository.findById(id);
  if (!file) throw new NotFoundError('File');
  const buffer = await storage.getFile(file.storageKey);
  return { file, buffer };
};

/**
 * The anonymous read path, for media authored as public website content.
 *
 * Two conditions, both required, and a failure of either is reported as a
 * plain 404: a caller with no credentials must not be able to tell "this id is
 * a private upload" from "this id does not exist".
 *
 *   1. The file opted in at upload time, via a publicly servable entity type.
 *   2. It is renderable media - an image or a video. This endpoint serves
 *      inline, so it must never be reachable for a PDF, a CSV, or anything
 *      else that happens to share an entity type.
 */
export const getPublicMedia = async (
  id: string,
): Promise<{ file: FileRecord; buffer: Buffer }> => {
  const file = await fileRepository.findById(id);
  if (!file) throw new NotFoundError('File');
  if (!isPubliclyServableEntityType(file.entityType)) throw new NotFoundError('File');
  if (!isPubliclyServableMimeType(file.mimeType)) throw new NotFoundError('File');

  const buffer = await storage.getFile(file.storageKey);
  return { file, buffer };
};

export const upload = async (
  input: UploadFileInput,
  context: RequestContext,
): Promise<FileRecord & { url: string }> => {
  if (input.buffer.length === 0) {
    throw new ValidationError('File is empty', [
      { field: 'file', message: 'File is empty', code: 'EMPTY_FILE' },
    ]);
  }
  if (input.buffer.length > env.maxUploadBytes) {
    throw new AppError(
      `File exceeds the maximum size of ${env.maxUploadBytes} bytes`,
      413,
      'FILE_TOO_LARGE',
    );
  }
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new ValidationError('Unsupported file type', [
      {
        field: 'mimeType',
        message: `${input.mimeType} is not an allowed file type`,
        code: 'UNSUPPORTED_MIME_TYPE',
      },
    ]);
  }

  // Write to storage BEFORE the transaction. If the database write then fails,
  // the orphaned blob is removed in the catch below; the reverse order would
  // leave a database row pointing at a file that does not exist, which is the
  // worse failure.
  const stored = await storage.upload({
    buffer: input.buffer,
    originalName: input.originalName,
    mimeType: input.mimeType,
    keyPrefix: input.entityType,
  });

  try {
    const record = await withTransaction(async (client) => {
      const created = await fileRepository.create(
        {
          storageKey: stored.storageKey,
          originalName: input.originalName,
          mimeType: input.mimeType,
          sizeBytes: stored.sizeBytes,
          provider: stored.provider,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          uploadedBy: context.adminId,
        },
        client,
      );

      await auditLogService.record(
        {
          action: AUDIT_ACTIONS.FILE_UPLOADED,
          module: 'files',
          entityType: 'file',
          entityId: created.id,
          newValues: {
            originalName: created.originalName,
            mimeType: created.mimeType,
            sizeBytes: created.sizeBytes,
            entityType: created.entityType,
            entityId: created.entityId,
          },
        },
        context,
        client,
      );

      return created;
    });

    return { ...record, url: await storage.getPublicUrl(record.storageKey) };
  } catch (error) {
    await storage.delete(stored.storageKey).catch((cleanupError: unknown) => {
      logger.error('Failed to clean up orphaned upload', {
        storageKey: stored.storageKey,
        message: (cleanupError as Error).message,
      });
    });
    throw error;
  }
};

/**
 * Soft-deletes the record and removes the blob.
 *
 * The blob is deleted after the transaction commits: deleting it first would
 * destroy the file even if the database write rolled back.
 */
export const remove = async (id: string, context: RequestContext): Promise<void> => {
  const file = await withTransaction(async (client) => {
    const existing = await fileRepository.findById(id, client);
    if (!existing) throw new NotFoundError('File');

    await fileRepository.softDelete(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.FILE_DELETED,
        module: 'files',
        entityType: 'file',
        entityId: id,
        oldValues: {
          originalName: existing.originalName,
          mimeType: existing.mimeType,
          sizeBytes: existing.sizeBytes,
        },
      },
      context,
      client,
    );

    return existing;
  });

  await storage.delete(file.storageKey).catch((error: unknown) => {
    // The record is already soft-deleted, so the file is inaccessible via the
    // API. A leftover blob is a cleanup problem, not a correctness problem.
    logger.error('Failed to delete blob after record removal', {
      fileId: id,
      storageKey: file.storageKey,
      message: (error as Error).message,
    });
  });
};
