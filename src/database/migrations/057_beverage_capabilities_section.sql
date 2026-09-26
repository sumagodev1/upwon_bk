-- Beverages & Juices industry page CMS: the core capabilities section.
--
-- "Built for Every Step of Your Beverage Business." A centred heading over a
-- tabbed viewer: a list of capability titles on the left, and on the right the
-- selected one's description over its own screenshot - all on a soft
-- background illustration.
--
-- Not the Engineering page's shape (050): that section lays its copy into
-- cards drawn in one fixed artwork, where this one gives every capability its
-- own picture. So it follows the industry coverage section's pattern instead -
-- one panel record (the background) and one list.
--
-- The copy lives in page_section_copy under ('beverage', 'capabilities'). Both
-- keys are already allowed, so no check widens here.

-- ── the background panel ──────────────────────────────────────────────────

CREATE TABLE beverage_capabilities_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The background illustration, from one of two mutually exclusive sources.
  -- Optional: with neither, the site keeps the one it ships. Decoration, so no
  -- alt text.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT beverage_capabilities_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT beverage_capabilities_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL)
);

-- ── the capabilities ──────────────────────────────────────────────────────

CREATE TABLE beverage_capabilities (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The tab label, and the screenshot's alt text.
  title             VARCHAR(120)  NOT NULL,
  -- The line over the screenshot when this tab is selected.
  description       VARCHAR(400)  NOT NULL,

  -- The screenshot, from one of two mutually exclusive sources. Optional:
  -- without one the frame stays white rather than the tab disappearing.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT beverage_capabilities_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT beverage_capabilities_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT beverage_capabilities_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT beverage_capabilities_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '')
);

CREATE INDEX idx_beverage_capabilities_order
  ON beverage_capabilities (display_order, created_at);
CREATE INDEX idx_beverage_capabilities_status ON beverage_capabilities (status);

CREATE TRIGGER beverage_capabilities_panel_set_updated_at
  BEFORE UPDATE ON beverage_capabilities_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER beverage_capabilities_set_updated_at
  BEFORE UPDATE ON beverage_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
