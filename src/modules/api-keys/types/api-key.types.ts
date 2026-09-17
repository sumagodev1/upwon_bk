import { ApiKeyStatus } from '../../../config/constants';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  status: ApiKeyStatus;
  createdBy: string | null;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ApiKeyWithScopes extends ApiKey {
  scopes: string[];
}

/** Returned exactly once, at creation. The raw key is never stored or re-shown. */
export interface CreatedApiKey extends ApiKeyWithScopes {
  key: string;
}

export interface ResolvedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy: string | null;
  scopes: Set<string>;
}

export interface CreateApiKeyDto {
  name: string;
  permissionIds: string[];
  expiresAt?: Date;
}
