// src/modules/api-keys/services/api-key.service.ts

import { withTransaction } from '../../../config/database';
import { AUDIT_ACTIONS } from '../../../config/constants';
import { NotFoundError } from '../../../core/errors/NotFoundError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { PaginationParams, RequestContext } from '../../../core/types/common.types';
import { generateSecureToken, sha256 } from '../../../core/utils/crypto';
import { buildPaginationMeta, PaginationMeta } from '../../../core/utils/pagination';
import { logger } from '../../../core/utils/logger';
import * as auditLogService from '../../audit-logs/services/audit-log.service';
import * as permissionRepository from '../../permissions/repositories/permission.repository';
import * as apiKeyRepository from '../repositories/api-key.repository';
import {
  ApiKeyWithScopes,
  CreateApiKeyDto,
  CreatedApiKey,
  ResolvedApiKey,
} from '../types/api-key.types';

const KEY_ENVIRONMENT_PREFIX = 'upw';

export const list = async (
  pagination: PaginationParams,
): Promise<{ rows: ApiKeyWithScopes[]; meta: PaginationMeta }> => {
  const { rows, total } = await apiKeyRepository.findAll(pagination);
  return { rows, meta: buildPaginationMeta(total, pagination) };
};

export const getById = async (id: string): Promise<ApiKeyWithScopes> => {
  const apiKey = await apiKeyRepository.findById(id);
  if (!apiKey) throw new NotFoundError('API key');
  return apiKey;
};

/**
 * The raw key is returned exactly once here and never again - only the prefix
 * and a SHA-256 hash are persisted.
 */
export const create = async (
  input: CreateApiKeyDto,
  context: RequestContext,
): Promise<CreatedApiKey> => {
  const existing = await permissionRepository.findExistingIds(input.permissionIds);
  const missing = input.permissionIds.filter((id) => !existing.includes(id));
  if (missing.length > 0) {
    throw new ValidationError('One or more permissions do not exist', [
      {
        field: 'permissionIds',
        message: `Unknown permission ids: ${missing.join(', ')}`,
        code: 'UNKNOWN_PERMISSION',
      },
    ]);
  }

  const secret = generateSecureToken(32);
  const rawKey = `${KEY_ENVIRONMENT_PREFIX}_${secret}`;
  const keyPrefix = rawKey.slice(0, 12);
  const keyHash = sha256(rawKey);

  const created = await withTransaction(async (client) => {
    const apiKey = await apiKeyRepository.create(
      {
        name: input.name,
        keyPrefix,
        keyHash,
        createdBy: context.adminId,
        expiresAt: input.expiresAt ?? null,
      },
      client,
    );

    await apiKeyRepository.attachScopes(apiKey.id, input.permissionIds, client);
    const scopeKeys = await permissionRepository.findKeysByIds(input.permissionIds, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.API_KEY_CREATED,
        module: 'api_keys',
        entityType: 'api_key',
        entityId: apiKey.id,
        newValues: {
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          scopes: scopeKeys,
          expiresAt: apiKey.expiresAt,
          // The raw key and its hash are never recorded.
        },
      },
      context,
      client,
    );

    return { apiKey, scopeKeys };
  });

  return { ...created.apiKey, scopes: created.scopeKeys, key: rawKey };
};

export const revoke = async (id: string, context: RequestContext): Promise<void> => {
  await withTransaction(async (client) => {
    const existing = await apiKeyRepository.findById(id, client);
    if (!existing) throw new NotFoundError('API key');

    // Revocation is idempotent - an already-revoked key is a success.
    await apiKeyRepository.revoke(id, client);

    await auditLogService.record(
      {
        action: AUDIT_ACTIONS.API_KEY_REVOKED,
        module: 'api_keys',
        entityType: 'api_key',
        entityId: id,
        oldValues: { name: existing.name, keyPrefix: existing.keyPrefix },
        newValues: { status: 'REVOKED' },
      },
      context,
      client,
    );
  });
};

/** Authentication path, called by the API key middleware. */
export const resolve = async (keyHash: string): Promise<ResolvedApiKey | null> =>
  apiKeyRepository.resolveByHash(keyHash);

/** Telemetry, not correctness - failures are logged and swallowed. */
export const touchLastUsed = async (id: string): Promise<void> => {
  try {
    await apiKeyRepository.touchLastUsed(id);
  } catch (error) {
    logger.debug('Failed to update API key last_used_at', {
      apiKeyId: id,
      message: (error as Error).message,
    });
  }
};
