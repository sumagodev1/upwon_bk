# Schema reference

`src/database/migrations/` is the **single source of truth** for the schema.
Reference copies are deliberately not kept here: two copies of the same DDL
drift, and the copy is always the one that is wrong.

To see the live schema:

```bash
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > schema.sql
```

To see what has been applied:

```bash
npm run migrate:status
```

## Tables

| Migration | Tables |
|---|---|
| `001_extensions.sql` | `citext`, `set_updated_at()` trigger function |
| `002_admins.sql` | `admins` |
| `003_roles_permissions.sql` | `roles`, `permissions`, `admin_roles`, `role_permissions` |
| `004_admin_sessions.sql` | `admin_sessions`, `password_reset_tokens` |
| `005_organizations.sql` | `organizations` |
| `006_plans_subscriptions.sql` | `plans`, `subscriptions` |
| `007_audit_logs.sql` | `audit_logs` |
| `008_settings_notifications.sql` | `settings`, `notifications` |
| `009_api_keys_files.sql` | `api_keys`, `api_key_scopes`, `files` |
