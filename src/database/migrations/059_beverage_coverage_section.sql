-- Beverages & Juices industry page CMS: the industry coverage section.
--
-- "Built for a Wide Range of Beverage & Juice Businesses." A centred heading
-- over a grid of beverage categories, each with an icon badge, a name and a
-- line about what UpWon keeps connected for it.
--
-- Not the Engineering page's shape (052): there is no background illustration
-- here, and every card carries a description. The badge colours cycle by
-- position through three fixed colours in the site's own code, so they are
-- not stored per row.
--
-- The copy lives in page_section_copy under ('beverage', 'coverage'). Both
-- keys are already allowed, so no check widens here.

CREATE TABLE beverage_coverage_categories (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  label             VARCHAR(120)  NOT NULL,
  -- The line under the name.
  detail            VARCHAR(300)  NOT NULL,
  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT beverage_coverage_categories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT beverage_coverage_categories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT beverage_coverage_categories_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(detail) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_beverage_coverage_categories_order
  ON beverage_coverage_categories (display_order, created_at);
CREATE INDEX idx_beverage_coverage_categories_status
  ON beverage_coverage_categories (status);

CREATE TRIGGER beverage_coverage_categories_set_updated_at
  BEFORE UPDATE ON beverage_coverage_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
