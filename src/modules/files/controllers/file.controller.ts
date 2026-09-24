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

/**
 * The website-facing media read. Unauthenticated, and inline by default
 * because the whole point is to render in an <img> or a <video>. Pass
 * ?download to get it as an attachment instead - the report PDF behind the
 * home page's call to action is the one caller that wants that.
 *
 * Content-Type is echoed from the stored record, but nosniff still applies:
 * the service has already established this is renderable media, and nosniff
 * stops a browser second-guessing that from the bytes.
 *
 * Accept-Ranges is advertised so a <video> can seek. The body is still sent
 * whole - range requests are not honoured here - which is fine for the short
 * product clips this serves, but is the thing to revisit if long video is ever
 * put behind it.
 */
export const getPublicMediaController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = validateUuidParam(req.params.id);
  const { file, buffer } = await fileService.getPublicMedia(id);

  /*
   * ?download switches the browser from viewing to saving.
   *
   * It has to be the server that says so: the marketing site is a different
   * origin from this API, and a cross-origin <a download> is ignored, so a
   * PDF linked from the site would open in the viewer rather than download.
   *
   * The filename is sent twice on purpose - the RFC 5987 form carries the
   * real name, and the quoted ASCII fallback is there for clients that do not
   * read it. Quotes, backslashes and control characters are stripped from
   * that fallback so an uploaded name cannot break out of the header.
   */
  const asAttachment = req.query.download !== undefined;
  const safeName =
    file.originalName.replace(/[\u0000-\u001f"\\]/g, '').slice(0, 200) || 'download';
  const disposition = asAttachment
    ? `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
    : 'inline';

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', disposition);
  res.setHeader('Accept-Ranges', 'none');
  // The bytes at a given id never change - a replaced image gets a new id -
  // so this is safe to cache hard, and the marketing site benefits most.
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
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
