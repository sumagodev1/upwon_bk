-- BIGINT IDENTITY rather than UUID: audit logs are the highest-write table,
-- always read in insertion order, and never referenced by external systems.
-- A monotonic key keeps the index dense and inserts append-only; a random UUID
-- primary key would fragment the index for no benefit here.
CREATE TABLE audit_logs (
  id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- SET NULL, not CASCADE: an audit record must survive the deletion of its
  -- actor. That is the whole point of an audit trail. Because admins are
  -- soft-deleted, this only fires on a genuine hard purge.
  admin_id     UUID         REFERENCES admins(id) ON DELETE SET NULL,
  action       VARCHAR(80)  NOT NULL,
  module       VARCHAR(50)  NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    VARCHAR(64),
  old_values   JSONB,
  new_values   JSONB,
  ip_address   INET,
  user_agent   TEXT,
  request_id   UUID,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_idx  ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_admin_idx    ON audit_logs (admin_id, created_at DESC);
CREATE INDEX audit_logs_module_idx   ON audit_logs (module, created_at DESC);
CREATE INDEX audit_logs_entity_idx   ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_request_idx  ON audit_logs (request_id);
