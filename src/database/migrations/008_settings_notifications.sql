CREATE TABLE settings (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key           VARCHAR(100) NOT NULL UNIQUE,
  -- JSONB so a setting can be a scalar, an object, or a list without schema churn.
  value         JSONB        NOT NULL,
  description   TEXT,
  -- Gates updates to SUPER_ADMIN and masks the value on read for everyone else.
  is_sensitive  BOOLEAN      NOT NULL DEFAULT false,
  updated_by    UUID         REFERENCES admins(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT settings_key_format_check
    CHECK (key ~ '^[a-z][a-z0-9_]{2,99}$')
);

CREATE TRIGGER settings_set_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE notifications (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL admin_id is a broadcast row visible to everyone; the broadcast path
  -- in the repository fans out to one row per ACTIVE admin so each recipient
  -- can mark it read independently.
  admin_id    UUID         REFERENCES admins(id) ON DELETE CASCADE,
  type        VARCHAR(40)  NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  metadata    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT notifications_type_check
    CHECK (type IN ('SYSTEM', 'SECURITY', 'BILLING', 'ORGANIZATION', 'GENERAL'))
);

CREATE INDEX notifications_inbox_idx ON notifications (admin_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (admin_id) WHERE read_at IS NULL;
