CREATE TABLE admin_sessions (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id            UUID         NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  -- HMAC-SHA256 hex. The raw refresh token is NEVER stored.
  refresh_token_hash  CHAR(64)     NOT NULL UNIQUE,
  device_name         VARCHAR(120),
  user_agent          TEXT,
  ip_address          INET,
  expires_at          TIMESTAMPTZ  NOT NULL,
  revoked_at          TIMESTAMPTZ,
  -- Self-reference recording the rotation chain. Without it, reuse detection
  -- tells you THAT a stolen token was replayed but not where the compromise
  -- occurred in the chain.
  replaced_by         UUID         REFERENCES admin_sessions(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX admin_sessions_active_idx
  ON admin_sessions (admin_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX admin_sessions_expiry_idx ON admin_sessions (expires_at);

CREATE TABLE password_reset_tokens (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID         NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash  CHAR(64)     NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX password_reset_tokens_admin_idx
  ON password_reset_tokens (admin_id) WHERE used_at IS NULL;
