// src/modules/permissions/services/permission.service.ts

import { Executor } from '../../../config/database';
import { ALL_PERMISSION_KEYS, SYSTEM_ROLES } from '../../../config/constants';
import * as permissionRepository from '../repositories/permission.repository';
import { Permission, PermissionGroup, ResolvedAccess } from '../types/permission.types';

interface CacheEntry {
  roles: string[];
  permissions: Set<string>;
  expiresAt: number;
}

/**
 * Per-process permission cache.
 *
 * TTL is intentionally short (30s). Consequence to understand before changing
 * it: on an N-node deployment, revoking a role propagates to every node within
 * TTL seconds, NOT instantly. The invalidation helpers below clear only the
 * local node.
 *
 * The database is always authoritative - this only avoids re-reading it on
 * every request within the window.
 *
 * FUTURE: replace with a shared cache, or pub/sub invalidation, when moving
 * beyond a small fixed node count.
 */
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [adminId, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(adminId);
  }
}, 5 * 60_000);
sweepTimer.unref();

const readCache = (adminId: string): CacheEntry | null => {
  const entry = cache.get(adminId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(adminId);
    return null;
  }
  return entry;
};

/**
 * Resolves an admin's roles and permissions, cache-first.
 *
 * Called on EVERY authenticated request, so the cache matters: without it this
 * is two round trips per request.
 *
 * ADMIN is expanded to the full catalogue here. Its access is a
 * short-circuit in the middleware and it holds no role_permissions rows, so
 * without this expansion the API would report `permissions: []` for the most
 * privileged account - and a client doing `permissions.includes(...)` would
 * hide every screen from the one person who can see everything.
 */
export const resolveForAdmin = async (adminId: string): Promise<ResolvedAccess> => {
  const cached = readCache(adminId);
  if (cached) {
    return { roles: cached.roles, permissions: cached.permissions };
  }

  const [roles, permissionKeys] = await Promise.all([
    permissionRepository.findRoleNamesForAdmin(adminId),
    permissionRepository.findPermissionKeysForAdmin(adminId),
  ]);

  const permissions = roles.includes(SYSTEM_ROLES.ADMIN)
    ? new Set<string>(ALL_PERMISSION_KEYS)
    : new Set(permissionKeys);

  cache.set(adminId, { roles, permissions, expiresAt: Date.now() + CACHE_TTL_MS });
  return { roles, permissions };
};

export const listAll = async (): Promise<Permission[]> => permissionRepository.findAll();

/** Grouped by module - the shape the role editor UI needs. */
export const listGroupedByModule = async (): Promise<PermissionGroup[]> => {
  const permissions = await permissionRepository.findAll();
  const grouped = new Map<string, Permission[]>();

  for (const permission of permissions) {
    const bucket = grouped.get(permission.module) ?? [];
    bucket.push(permission);
    grouped.set(permission.module, bucket);
  }

  return [...grouped.entries()]
    .map(([module, items]) => ({ module, permissions: items }))
    .sort((a, b) => a.module.localeCompare(b.module));
};

export const rolesForAdmin = async (
  adminId: string,
  executor?: Executor,
): Promise<string[]> => permissionRepository.findRoleNamesForAdmin(adminId, executor);

export const permissionsForAdmin = async (
  adminId: string,
  executor?: Executor,
): Promise<string[]> => permissionRepository.findPermissionKeysForAdmin(adminId, executor);

// ── cache invalidation ─────────────────────────────────────────────────────
// Called from the admin and role services at exactly four points: admin role
// assignment changed, role permissions changed, role deleted, admin status
// changed.

export const invalidateAdmin = (adminId: string): void => {
  cache.delete(adminId);
};

/** Blast radius of a role change is every admin, so the whole cache is cleared. */
export const invalidateEveryone = (): void => {
  cache.clear();
};
