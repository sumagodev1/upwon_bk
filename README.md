# Upwon Admin Backend

Internal admin panel API. Node.js + Express + TypeScript + PostgreSQL, raw
parameterized SQL via `pg`. No ORM, no Redis, no Docker.

This backend serves **internal platform administrators only**. There is no
customer-facing surface and no tenant runtime — organizations and subscriptions
are managed records, not tenants.

## Requirements

- Node.js 20+
- PostgreSQL 14+ (uses `gen_random_uuid()` and `citext`)

## Setup

```bash
npm install
```

Edit `.env`. At minimum, set `DATABASE_URL` and generate two **different** JWT
secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Create the database, then:

```bash
npm run migrate      # apply schema
npm run seed         # permissions, roles, settings, first SUPER_ADMIN
npm run dev          # start with hot reload on :4000
```

The seed reads `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` from
`.env`. It never overwrites an existing admin's password.

Verify:

```bash
curl localhost:4000/health/ready
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | tsx watch, hot reload |
| `npm run build` | compile to `dist/` |
| `npm start` | run the compiled build |
| `npm run typecheck` | tsc, no emit |
| `npm run migrate` | apply pending migrations |
| `npm run migrate:status` | list applied/pending migrations |
| `npm run seed` | idempotent seed |
| `npm run db:setup` | migrate + seed |
| `npm run audit:routes` | assert every route has an authorization guard |

## Architecture

```
HTTP → requestId → logger → rateLimit → authenticate → requirePermission
     → controller → validate → service → repository → PostgreSQL
```

- **Controllers** are thin: extract, validate, delegate, respond. No SQL, no
  business branching, no try/catch (`asyncHandler` routes rejections to the
  error middleware).
- **Services** own business rules, invariants, transactions, and audit writes.
  They never import Express types.
- **Repositories** own SQL. Every value is parameterized; dynamic sort and
  filter columns resolve through per-module whitelists, never from user input.

```
src/
├── config/        env validation, pg pool, constants (permission catalogue)
├── core/          errors, middleware, utils, shared types, BaseRepository
├── modules/       one folder per domain: controller/service/repository/routes/
│                  validation/dto/types
├── database/      migrations, seeds, dashboard aggregate SQL
├── routes/        router composition + health probes
├── storage/       StorageProvider abstraction (local now, cloud later)
├── container.ts   composition root — all singletons wired here
├── app.ts         Express assembly (no listen)
└── server.ts      boot, health gate, graceful shutdown
```

`container.ts` is a single composition root rather than one container per
module: per-module containers create real circular imports (auth needs admins,
admins needs auth), and a DI framework would hide wiring better read as code.

## Authentication

- Access token: JWT HS256, 15 min, algorithm pinned.
- Refresh token: 32 bytes of entropy, **not** a JWT. Only an HMAC-SHA256 hash
  is stored, one row per device.
- Rotation on every refresh. Replaying a revoked token revokes the entire
  session family for that admin and raises a `SESSION_REUSE_DETECTED` audit
  event.
- The refresh token travels in an httpOnly `SameSite=Strict` cookie scoped to
  `/api/auth`. A JSON-body fallback exists for non-browser clients.
  `/auth/refresh` and `/auth/logout` additionally require an `X-Requested-With`
  header (CSRF guard).

**Permissions are not in the JWT.** They are read from the database per request
(cached in-process, 30s TTL). A token carrying baked-in permissions would keep
a revoked permission live for up to 15 minutes, which is unacceptable for a
control plane. Roles are carried only as a fast-path hint; the middleware always
re-checks admin status and permissions against the database.

## Authorization

```
admins ──< admin_roles >── roles ──< role_permissions >── permissions
```

`requirePermission('organizations.update')` guards the endpoint. Record-level
rules live in services, because middleware would have to load the target record
to evaluate them:

| Rule | Enforced in |
|---|---|
| Can they call this endpoint? | middleware |
| Can they grant SUPER_ADMIN? | `AdminService` |
| Can they suspend themselves? | `AdminService` |
| Can they remove the last SUPER_ADMIN? | `AdminService`, under a row lock |
| Can they edit a sensitive setting? | `SettingService`, per key |

SUPER_ADMIN short-circuits permission checks in the middleware. Its grants are
**not** stored as rows — storing them would mean a deleted row could silently
downgrade the break-glass role.

The permission catalogue lives in `src/config/constants.ts` and the seed reads
from it, so a key checked in code always exists in the database.

## Auditing

`AuditLogService.record()` is called from services, not middleware — middleware
cannot know the entity id, the before-state, or whether the transaction
committed. Pass the transaction client for state changes so the audit row
commits or rolls back with the change it describes.

Passwords, tokens, hashes, and API keys are stripped by a denylist before
insert, at any nesting depth.

## Known limitations

Deliberate trade-offs, not oversights:

1. **Rate limiting is in-memory and per-process.** Behind N instances the
   effective limit is N × configured. Replace `MemoryRateLimitStore.hit()` with
   a shared counter (Redis `INCR`, or an `UNLOGGED` Postgres table) before
   scaling out. Call sites do not change.
2. **Local file storage blocks multi-node deployment for uploads.** A file on
   one node's disk is invisible to the others. Either point
   `STORAGE_LOCAL_PATH` at shared storage or implement `S3StorageProvider` —
   one new file plus one case in `storage.factory.ts`.
3. **Permission cache TTL means up to 30s of stale authorization** across
   nodes. The database is authoritative; the window is bounded and configurable.
4. **No MFA.** This is the one genuine security gap: a compromised admin
   password currently yields full platform access. TOTP against an
   `admin_mfa_secrets` table is a contained addition to `AuthService.login`.
5. **No email transport.** `ConsoleEmailTransport` prints reset links in
   development and refuses to pretend it delivered anything in production. The
   password reset flow is not functional for real users until a real transport
   is wired into `container.ts`.
6. **Fire-and-forget side effects can be lost** if the process dies mid-flight.
   The fix is a `job_queue` table enqueued inside the business transaction.
7. **`OFFSET` pagination** degrades past ~100k rows (capped at `maxOffset`).
   Cursor pagination on `(created_at, id)` is the fix if deep paging ever
   becomes a real access pattern.
8. **`audit_logs` is unpartitioned.** Fine to several million rows; partition by
   month before that.

## Testing

Node's built-in runner (`node --test`), no Jest. Highest value per unit of
effort, in order:

1. `core/utils/validation.ts` — pure, no setup, everything depends on it.
2. Service authorization guards — last-SUPER_ADMIN, role escalation,
   self-delete, status transitions. Mock the repositories.
3. `query-builder.ts` — assert `$n` numbering stays correct as conditions are
   added conditionally. An off-by-one here is a silent wrong-data bug.
4. Auth flows against a real test database — rotation, reuse detection,
   single-use reset tokens. Mocks would test the mock.
5. `npm run audit:routes` in CI.
