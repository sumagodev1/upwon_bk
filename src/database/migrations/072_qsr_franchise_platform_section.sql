-- QSR & Franchise F&B industry page CMS: the connected platform section.
--
-- "HOW UPWON HELPS - One Connected Platform for Your QSR & Franchise F&B
-- Operations." Copy, a grid of connected workflows and a closing line on the
-- left; the app artwork on the right.
--
-- The Beverages page's shape (058) - a panel record and a list of workflows,
-- each a label and an icon in one shared orange. The panel differs: its
-- picture is artwork rather than a background, so it carries a description,
-- and it holds the closing line under the grid.
--
-- The copy lives in page_section_copy under ('qsr-franchise', 'platform').
-- Both keys are already allowed, so no check widens here.

-- ── the panel ─────────────────────────────────────────────────────────────

CREATE TABLE qsr_franchise_platform_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The artwork, from one of two mutually exclusive sources. Optional: with
  -- neither, the site keeps the one it ships.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- Read aloud in place of the artwork. Required: it shows the product.
  image_alt         VARCHAR(300)  NOT NULL,

  -- The line over the workflow grid ("Connected Workflows Across:").
  -- Optional: with none the grid still reads.
  list_label        VARCHAR(80),

  -- The closing line under the grid: a bold title beside the link badge
  -- ("All Workflows. One Platform.") and a smaller line under it ("Connect.
  -- Control. Grow."). Without a title the closing line is not drawn.
  closing_title     VARCHAR(120),
  closing_subtext   VARCHAR(160),

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT qsr_franchise_platform_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT qsr_franchise_platform_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT qsr_franchise_platform_panel_alt_check
    CHECK (btrim(image_alt) <> ''),
  -- Absent is how a line is turned off; blank would draw an empty one.
  CONSTRAINT qsr_franchise_platform_panel_list_label_check
    CHECK (list_label IS NULL OR btrim(list_label) <> ''),
  CONSTRAINT qsr_franchise_platform_panel_closing_title_check
    CHECK (closing_title IS NULL OR btrim(closing_title) <> ''),
  CONSTRAINT qsr_franchise_platform_panel_closing_subtext_check
    CHECK (closing_subtext IS NULL OR btrim(closing_subtext) <> '')
);

-- ── the workflows ─────────────────────────────────────────────────────────

CREATE TABLE qsr_franchise_platform_workflows (
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

  CONSTRAINT qsr_franchise_platform_workflows_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT qsr_franchise_platform_workflows_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT qsr_franchise_platform_workflows_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_qsr_franchise_platform_workflows_order
  ON qsr_franchise_platform_workflows (display_order, created_at);
CREATE INDEX idx_qsr_franchise_platform_workflows_status
  ON qsr_franchise_platform_workflows (status);

CREATE TRIGGER qsr_franchise_platform_panel_set_updated_at
  BEFORE UPDATE ON qsr_franchise_platform_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER qsr_franchise_platform_workflows_set_updated_at
  BEFORE UPDATE ON qsr_franchise_platform_workflows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
