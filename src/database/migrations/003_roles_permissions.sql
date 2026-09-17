CREATE TABLE roles (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(50)  NOT NULL UNIQUE,
  description     TEXT,
  is_system_role  BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT roles_name_format_check
    CHECK (name ~ '^[A-Z][A-Z0-9_]{2,49}$')
);

CREATE TRIGGER roles_set_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE permissions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key          VARCHAR(100) NOT NULL UNIQUE,
  module       VARCHAR(50)  NOT NULL,
  action       VARCHAR(50)  NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- The key is the contract; module/action must agree with it.
  CONSTRAINT permissions_key_matches_parts
    CHECK (key = module || '.' || action),
  CONSTRAINT permissions_key_format_check
    CHECK (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);

CREATE INDEX permissions_module_idx ON permissions (module);

-- Composite PK, not a surrogate key: there is no meaningful identity for
-- "admin 7 has role 3" beyond the pair, and this makes a duplicate grant
-- impossible at the storage layer rather than in application code.
CREATE TABLE admin_roles (
  admin_id     UUID        NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  role_id      UUID        NOT NULL REFERENCES roles(id)  ON DELETE RESTRICT,
  assigned_by  UUID        REFERENCES admins(id) ON DELETE SET NULL,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (admin_id, role_id)
);

-- Reverse lookup: "who holds this role?" - needed by the last-SUPER_ADMIN guard.
CREATE INDEX admin_roles_role_idx ON admin_roles (role_id);

CREATE TABLE role_permissions (
  role_id        UUID        NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
  permission_id  UUID        NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX role_permissions_permission_idx ON role_permissions (permission_id);
