-- Beverages & Juices industry page CMS: the connected platform section.
--
-- "HOW UPWON HELPS - One Connected Platform for Your Beverages & Juices
-- Operations." Copy and a grid of connected workflows, over a banner that
-- carries its bottles and fruit on the right.
--
-- Not the Engineering page's shape (051), which puts an illustration in a
-- centre column and colours each workflow. Here the picture is the section's
-- background and every workflow shares one orange, so the panel holds the
-- background and the label over the grid, and a workflow is a label and an
-- icon - the Engineering industry coverage shape (052), plus that label.
--
-- The copy lives in page_section_copy under ('beverage', 'platform'). Both
-- keys are already allowed, so no check widens here.

-- ── the panel ─────────────────────────────────────────────────────────────

CREATE TABLE beverage_platform_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The background, from one of two mutually exclusive sources. Optional:
  -- with neither, the site keeps the one it ships. Decoration, so no alt text.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The line over the workflow grid ("Connected Workflows Across:").
  -- Optional: with none the grid still reads.
  list_label        VARCHAR(80),

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT beverage_platform_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT beverage_platform_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- Absent is how the label is turned off; blank would draw an empty line.
  CONSTRAINT beverage_platform_panel_list_label_check
    CHECK (list_label IS NULL OR btrim(list_label) <> '')
);

-- ── the workflows ─────────────────────────────────────────────────────────

CREATE TABLE beverage_platform_workflows (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  label             VARCHAR(120)  NOT NULL,
  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT beverage_platform_workflows_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT beverage_platform_workflows_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT beverage_platform_workflows_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_beverage_platform_workflows_order
  ON beverage_platform_workflows (display_order, created_at);
CREATE INDEX idx_beverage_platform_workflows_status
  ON beverage_platform_workflows (status);

CREATE TRIGGER beverage_platform_panel_set_updated_at
  BEFORE UPDATE ON beverage_platform_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER beverage_platform_workflows_set_updated_at
  BEFORE UPDATE ON beverage_platform_workflows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
