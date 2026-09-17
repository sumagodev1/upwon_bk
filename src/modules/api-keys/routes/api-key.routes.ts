// src/modules/api-keys/routes/api-key.routes.ts

import { Router } from 'express';
import {
  createApiKeyController,
  getAllApiKeysController,
  getApiKeyByIdController,
  revokeApiKeyController,
} from '../controllers/api-key.controller';
import { PERMISSIONS } from '../../../config/constants';
import { requirePermission } from '../../../core/middleware/authorization.middleware';
import { asyncHandler } from '../../../core/utils/async-handler';

const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.API_KEYS_READ),
  asyncHandler(getAllApiKeysController),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.API_KEYS_CREATE),
  asyncHandler(createApiKeyController),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.API_KEYS_READ),
  asyncHandler(getApiKeyByIdController),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.API_KEYS_REVOKE),
  asyncHandler(revokeApiKeyController),
);

export default router;
