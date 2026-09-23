// src/modules/files/routes/file.routes.ts

import { Router } from 'express';
import multer from 'multer';
import {
  deleteFileController,
  downloadFileController,
  getAllFilesController,
  getFileByIdController,
  getPublicMediaController,
  uploadFileController,
} from '../controllers/file.controller';
import { PERMISSIONS } from '../../../config/constants';
import { env } from '../../../config/env';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import {
  standardRateLimit,
  uploadRateLimit,
} from '../../../core/middleware/rate-limit.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

/**
 * memoryStorage keeps the StorageProvider abstraction intact: multer never
 * touches the filesystem, so swapping LOCAL for S3 changes nothing here.
 * The size limit is enforced twice - here to stop the read early, and again in
 * the file service, which is the boundary a non-HTTP caller would cross.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
});

router.get('/', requirePermission(PERMISSIONS.FILES_READ), asyncHandler(getAllFilesController));

router.post(
  '/',
  requirePermission(PERMISSIONS.FILES_UPLOAD),
  uploadRateLimit,
  upload.single('file'),
  asyncHandler(uploadFileController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.FILES_READ),
  asyncHandler(getFileByIdController),
);

router.get(
  '/:id/download',
  requirePermission(PERMISSIONS.FILES_READ),
  asyncHandler(downloadFileController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.FILES_DELETE),
  asyncHandler(deleteFileController),
);

export default router;

/**
 * Public router, mounted outside the authentication middleware.
 *
 * Serves only uploads that opted in by entity type and are renderable media -
 * see fileService.getPublicMedia. This exists because the marketing site is an
 * anonymous browser client: an <img> it renders carries no token, so the
 * authenticated download route above can never satisfy it.
 *
 * Rate limited on top of the global limiter, since it reads from disk and is
 * reachable without credentials.
 */
export const publicFileRouter = Router();

publicFileRouter.get('/:id', standardRateLimit, asyncHandler(getPublicMediaController));
