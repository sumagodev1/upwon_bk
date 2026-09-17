// src/modules/files/controllers/file.controller.ts

import { Request, Response } from 'express';
import * as fileService from '../services/file.service';
import {
  validateFileListQuery,
  validateUploadMetadata,
} from '../validators/file.validator';
import { ValidationError } from '../../../core/errors/ValidationError';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllFilesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { filters, pagination } = validateFileListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await fileService.list(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Files retrieved successfully');
};

export const getFileByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const file = await fileService.getById(id);
  return ApiResponse.success(res, file, 'File retrieved successfully');
};

export const uploadFileController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const uploaded = req.file;
  if (!uploaded) {
    throw new ValidationError('No file provided', [
      { field: 'file', message: 'A file is required', code: 'REQUIRED' },
    ]);
  }

  const metadata = validateUploadMetadata(req.body);
  const file = await fileService.upload(
    {
      buffer: uploaded.buffer,
      originalName: uploaded.originalname,
      mimeType: uploaded.mimetype,
      entityType: metadata.entityType,
      entityId: metadata.entityId,
    },
    buildContext(req),
  );
  return ApiResponse.created(res, file, 'File uploaded successfully');
};

export const downloadFileController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = validateUuidParam(req.params.id);
  const { file, buffer } = await fileService.download(id);

  // attachment + nosniff: the browser must never render an uploaded file
  // inline, whatever its declared type claims.
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(file.originalName)}"`,
  );
  res.status(200).send(buffer);
};

export const deleteFileController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await fileService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
