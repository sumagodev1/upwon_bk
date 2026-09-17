CREATE TABLE plans (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(120)   NOT NULL,
  code              VARCHAR(60)    NOT NULL UNIQUE,
  description       TEXT,
  -- NUMERIC, never float. pg returns it as a string to avoid precision loss.
  price             NUMERIC(12, 2) NOT NULL,
  currency          CHAR(3)        NOT NULL DEFAULT 'USD',
  billing_interval  VARCHAR(20)    NOT NULL,
  features          JSONB          NOT NULL DEFAULT '{}'::jsonb,
  status            VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT plans_price_non_negative CHECK (price >= 0),
  CONSTRAINT plans_billing_interval_check
    CHECK (billing_interval IN ('MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME')),
  CONSTRAINT plans_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  CONSTRAINT plans_code_format_check
    CHECK (code ~ '^[A-Z0-9][A-Z0-9_]{1,59}$'),
  CONSTRAINT plans_features_is_object
    CHECK (jsonb_typeof(features) = 'object')
);

CREATE INDEX plans_status_idx ON plans (status);
CREATE INDEX plans_features_idx ON plans USING gin (features);

CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE subscriptions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- RESTRICT: a plan with live subscriptions must not vanish. The service
  -- archives plans instead of deleting them; this is the backstop that turns a
  -- mistake into a 409 rather than orphaned billing data.
  plan_id          UUID        NOT NULL REFERENCES plans(id)         ON DELETE RESTRICT,
  status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  start_date       DATE        NOT NULL,
  end_date         DATE,
  cancelled_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_status_check
    CHECK (status IN ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'EXPIRED')),
  CONSTRAINT subscriptions_date_order
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Concurrency-safe business rule: one live subscription per organization.
-- A service-layer check would lose to concurrency; this index does not.
CREATE UNIQUE INDEX subscriptions_one_live_per_org
  ON subscriptions (organization_id)
  WHERE status IN ('ACTIVE', 'TRIALING');

CREATE INDEX subscriptions_org_idx    ON subscriptions (organization_id, created_at DESC);
CREATE INDEX subscriptions_plan_idx   ON subscriptions (plan_id);
CREATE INDEX subscriptions_status_idx ON subscriptions (status);

-- Drives the "expiring soon" dashboard tile without a full scan.
CREATE INDEX subscriptions_expiring_idx
  ON subscriptions (end_date)
  WHERE status IN ('ACTIVE', 'TRIALING') AND end_date IS NOT NULL;

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
