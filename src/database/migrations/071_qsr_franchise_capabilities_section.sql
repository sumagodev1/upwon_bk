-- QSR & Franchise F&B industry page CMS: the core capabilities section.
--
-- "Built to Power Every Part of Your F&B Operations." An artwork on the left;
-- on the right the copy over a drifting row of numbered cards, each with an
-- icon, a title and a description.
--
-- The Spices & Agro page's shape (064): one panel record and one list. The
-- panel holds the artwork, which carries information, so it keeps a
-- description too. The number on each card, and the colour of its icon, both
-- follow display order.
--
-- The copy lives in page_section_copy under ('qsr-franchise', 'capabilities').
-- Both keys are already allowed, so no check widens here.

-- ── the artwork panel ─────────────────────────────────────────────────────

CREATE TABLE qsr_franchise_capabilities_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The artwork, from one of two mutually exclusive sources. Optional: with
  -- neither, the site keeps the one it ships.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- Read aloud in place of the artwork. Required: it shows the workflows.
  image_alt         VARCHAR(300)  NOT NULL,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT qsr_franchise_capabilities_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT qsr_franchise_capabilities_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT qsr_franchise_capabilities_panel_alt_check
    CHECK (btrim(image_alt) <> '')
);

-- ── the capabilities ──────────────────────────────────────────────────────

CREATE TABLE qsr_franchise_capabilities (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  title             VARCHAR(120)  NOT NULL,
  description       VARCHAR(300)  NOT NULL,
  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT qsr_franchise_capabilities_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT qsr_franchise_capabilities_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT qsr_franchise_capabilities_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_qsr_franchise_capabilities_order
  ON qsr_franchise_capabilities (display_order, created_at);
CREATE INDEX idx_qsr_franchise_capabilities_status ON qsr_franchise_capabilities (status);

CREATE TRIGGER qsr_franchise_capabilities_panel_set_updated_at
  BEFORE UPDATE ON qsr_franchise_capabilities_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER qsr_franchise_capabilities_set_updated_at
  BEFORE UPDATE ON qsr_franchise_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
