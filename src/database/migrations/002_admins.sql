CREATE TABLE admins (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  email          CITEXT       NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,

  CONSTRAINT admins_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  CONSTRAINT admins_email_format_check
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT admins_name_not_blank
    CHECK (length(btrim(first_name)) > 0 AND length(btrim(last_name)) > 0)
);

-- Uniqueness among LIVE admins only, so a deleted address can be reused.
-- A plain UNIQUE(email) would permanently burn the address of any deleted admin.
CREATE UNIQUE INDEX admins_email_unique_live
  ON admins (email) WHERE deleted_at IS NULL;

CREATE INDEX admins_list_idx
  ON admins (created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX admins_status_idx
  ON admins (status) WHERE deleted_at IS NULL;

-- Name/email search without a leading-wildcard sequential scan.
CREATE INDEX admins_search_idx
  ON admins USING gin (
    to_tsvector('simple', first_name || ' ' || last_name || ' ' || email)
  ) WHERE deleted_at IS NULL;

CREATE TRIGGER admins_set_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
