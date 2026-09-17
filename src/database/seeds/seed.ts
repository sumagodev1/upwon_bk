import { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import { closePool, withTransaction } from '../../config/database';
import { env } from '../../config/env';
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_DESCRIPTIONS,
  SETTING_KEYS,
  SYSTEM_ROLES,
  SystemRole,
} from '../../config/constants';
import { logger } from '../../core/utils/logger';

/**
 * Idempotent seed. Safe to run repeatedly - every statement is an upsert or a
 * conditional insert, so re-running never duplicates or clobbers live data.
 */

// ── permissions ───────────────────────────────────────────────────────────
async function seedPermissions(client: PoolClient): Promise<number> {
  // Read from the constants catalogue, so a key checked in code always exists
  // in the database and vice versa.
  const rows = ALL_PERMISSION_KEYS.map((key) => {
    const [module, action] = key.split('.');
    return { key, module, action, description: PERMISSION_DESCRIPTIONS[key] };
  });

  const result = await client.query(
    `
    INSERT INTO permissions (key, module, action, description)
    SELECT unnested.key, unnested.module, unnested.action, unnested.description
      FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
        AS unnested(key, module, action, description)
    ON CONFLICT (key) DO UPDATE
      SET description = EXCLUDED.description
    `,
    [
      rows.map((row) => row.key),
      rows.map((row) => row.module),
      rows.map((row) => row.action),
      rows.map((row) => row.description),
    ],
  );

  return result.rowCount ?? 0;
}

// ── roles ─────────────────────────────────────────────────────────────────
async function seedRoles(client: PoolClient): Promise<void> {
  const roleNames = Object.values(SYSTEM_ROLES) as SystemRole[];

  for (const name of roleNames) {
    await client.query(
      `
      INSERT INTO roles (name, description, is_system_role)
      VALUES ($1, $2, true)
      ON CONFLICT (name) DO UPDATE
        SET description = EXCLUDED.description, is_system_role = true
      `,
      [name, ROLE_DESCRIPTIONS[name]],
    );
  }

  // ADMIN is deliberately absent from DEFAULT_ROLE_PERMISSIONS: its
  // access is a short-circuit in the authorization middleware, not a set of
  // rows. Granting them here would create a class of bug where deleting a row
  // silently downgrades the break-glass role.
  for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
        FROM roles r
        JOIN permissions p ON p.key = ANY($2::text[])
       WHERE r.name = $1
      ON CONFLICT (role_id, permission_id) DO NOTHING
      `,
      [roleName, permissionKeys],
    );
  }
}

// ── super admin ───────────────────────────────────────────────────────────
async function seedRootAdmin(client: PoolClient): Promise<{ created: boolean; email: string }> {
  const email = (process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@upwon.local')
    .trim()
    .toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const firstName = process.env.SEED_SUPER_ADMIN_FIRST_NAME ?? 'Super';
  const lastName = process.env.SEED_SUPER_ADMIN_LAST_NAME ?? 'Admin';

  if (!password) {
    throw new Error(
      'SEED_SUPER_ADMIN_PASSWORD is required. Set it in .env before seeding.',
    );
  }
  if (password.length < 12) {
    throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const existing = await client.query<{ id: string }>(
    'SELECT id FROM admins WHERE email = $1 AND deleted_at IS NULL',
    [email],
  );

  if (existing.rows.length > 0) {
    // Never overwrite an existing admin's password from a seed script.
    await client.query(
      `
      INSERT INTO admin_roles (admin_id, role_id)
      SELECT $1, r.id FROM roles r WHERE r.name = $2
      ON CONFLICT (admin_id, role_id) DO NOTHING
      `,
      [existing.rows[0].id, SYSTEM_ROLES.ADMIN],
    );
    return { created: false, email };
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

  const inserted = await client.query<{ id: string }>(
    `
    INSERT INTO admins (first_name, last_name, email, password_hash, status)
    VALUES ($1, $2, $3, $4, 'ACTIVE')
    RETURNING id
    `,
    [firstName, lastName, email, passwordHash],
  );

  await client.query(
    `
    INSERT INTO admin_roles (admin_id, role_id)
    SELECT $1, r.id FROM roles r WHERE r.name = $2
    `,
    [inserted.rows[0].id, SYSTEM_ROLES.ADMIN],
  );

  return { created: true, email };
}

// ── settings ──────────────────────────────────────────────────────────────
async function seedSettings(client: PoolClient): Promise<void> {
  const defaults: Array<{
    key: string;
    value: unknown;
    description: string;
    isSensitive: boolean;
  }> = [
    {
      key: SETTING_KEYS.PLATFORM_NAME,
      value: 'Upwon',
      description: 'Display name of the platform',
      isSensitive: false,
    },
    {
      key: SETTING_KEYS.SUPPORT_EMAIL,
      value: 'support@upwon.local',
      description: 'Address shown to customers for support enquiries',
      isSensitive: false,
    },
    {
      key: SETTING_KEYS.MAINTENANCE_MODE,
      value: { enabled: false, message: null },
      description: 'Platform-wide maintenance banner and gate',
      isSensitive: false,
    },
    {
      key: SETTING_KEYS.DEFAULT_SUBSCRIPTION_PLAN,
      value: null,
      description: 'Plan code assigned to new organizations by default',
      isSensitive: false,
    },
    {
      key: SETTING_KEYS.SECURITY_SETTINGS,
      value: {
        passwordMinLength: 12,
        sessionIdleMinutes: 60,
        maxLoginAttempts: 5,
        requireMfa: false,
      },
      description: 'Security policy knobs. ADMIN only.',
      isSensitive: true,
    },
  ];

  for (const setting of defaults) {
    // DO NOTHING, not DO UPDATE: re-running the seed must never revert a value
    // an administrator has deliberately changed.
    await client.query(
      `
      INSERT INTO settings (key, value, description, is_sensitive)
      VALUES ($1, $2::jsonb, $3, $4)
      ON CONFLICT (key) DO NOTHING
      `,
      [setting.key, JSON.stringify(setting.value), setting.description, setting.isSensitive],
    );
  }
}

// ── runner ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  try {
    const summary = await withTransaction(async (client) => {
      const permissionCount = await seedPermissions(client);
      await seedRoles(client);
      await seedSettings(client);
      const rootAdmin = await seedRootAdmin(client);
      return { permissionCount, rootAdmin };
    });

    logger.info('Seed complete', {
      permissions: summary.permissionCount,
      roles: Object.keys(SYSTEM_ROLES).length,
      rootAdminEmail: summary.rootAdmin.email,
      rootAdminCreated: summary.rootAdmin.created,
    });

    if (summary.rootAdmin.created) {
      console.log(
        `\n  ADMIN created: ${summary.rootAdmin.email}` +
          `\n  Sign in with the password from SEED_SUPER_ADMIN_PASSWORD, then change it.\n`,
      );
    } else {
      console.log(
        `\n  ADMIN already exists (${summary.rootAdmin.email}) - password unchanged.\n`,
      );
    }

    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', { message: (error as Error).message });
    await closePool().catch(() => undefined);
    process.exit(1);
  }
}

void main();
