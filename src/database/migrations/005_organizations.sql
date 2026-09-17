CREATE TABLE organizations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  slug        CITEXT       NOT NULL,
  email       CITEXT       NOT NULL,
  phone       VARCHAR(30),
  status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,

  CONSTRAINT organizations_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  CONSTRAINT organizations_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 2 AND 100),
  CONSTRAINT organizations_email_format_check
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE UNIQUE INDEX organizations_slug_unique_live
  ON organizations (slug) WHERE deleted_at IS NULL;

CREATE INDEX organizations_list_idx
  ON organizations (created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX organizations_status_idx
  ON organizations (status) WHERE deleted_at IS NULL;

CREATE INDEX organizations_search_idx
  ON organizations USING gin (
    to_tsvector('simple', name || ' ' || slug || ' ' || email)
  ) WHERE deleted_at IS NULL;

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
