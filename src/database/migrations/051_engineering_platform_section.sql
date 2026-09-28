-- Engineering & Manufacturing industry page CMS: the connected platform section.
--
-- "HOW UPWON HELPS - One Connected Platform for Your Engineering &
-- Manufacturing Operations." Three columns: copy on the left, an illustration
-- of a connected plant in the centre, and a list of connected workflows on the
-- right.
--
-- Two tables, because they are two different edits: the centre panel is one
-- record (the illustration and the small label over the list), and the
-- workflows are a list an editor adds to and reorders.
--
-- The eyebrow, heading and subtext live once in page_section_copy under
-- ('engineering-manufacturing', 'platform'). The section key is new, so the
-- table's check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_section_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_section_key_check
    CHECK (section_key IN (
    -- Merge union: three branches each re-declared this list with only their
    -- own pages, so the last to run erased the rest. Every key the codebase
    -- declares is listed here - see PAGE_SECTION_KEYS in src/config/constants.ts.
      'hero', 'trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta',
      'recognition', 'benefits', 'alternatives', 'outcomes', 'establishers', 'proof',
      'video', 'packages', 'platform', 'helps', 'coverage', 'capabilities', 'network',
      'lifecycle'
    ));

-- ── the centre panel ──────────────────────────────────────────────────────
--
-- One record. The singleton column is what an upsert conflicts on, so the
-- first save creates it and every later save replaces it.

CREATE TABLE engineering_platform_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The illustration, from one of two mutually exclusive sources. Optional:
  -- with neither, the site keeps the illustration it ships.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- Read aloud in place of the illustration. Required, because it describes
  -- what the picture shows rather than decorating it.
  image_alt         VARCHAR(300)  NOT NULL,

  -- The small caps line over the workflow list ("Connected Workflows Across").
  -- Optional: with none the list still reads, just without the introduction.
  list_label        VARCHAR(80),

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT engineering_platform_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT engineering_platform_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT engineering_platform_panel_alt_check
    CHECK (btrim(image_alt) <> ''),
  -- Absent is how the label is turned off; blank would draw an empty line.
  CONSTRAINT engineering_platform_panel_list_label_check
    CHECK (list_label IS NULL OR btrim(list_label) <> '')
);

-- ── the workflows ─────────────────────────────────────────────────────────

CREATE TABLE engineering_platform_workflows (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  label             VARCHAR(120)  NOT NULL,

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,
  -- The icon's colour and the square behind it, both as #RRGGBB.
  accent_color      CHAR(7)       NOT NULL,
  tint_color        CHAR(7)       NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT engineering_platform_workflows_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT engineering_platform_workflows_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT engineering_platform_workflows_accent_color_check
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT engineering_platform_workflows_tint_color_check
    CHECK (tint_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT engineering_platform_workflows_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_engineering_platform_workflows_order
  ON engineering_platform_workflows (display_order, created_at);
CREATE INDEX idx_engineering_platform_workflows_status
  ON engineering_platform_workflows (status);

CREATE TRIGGER engineering_platform_panel_set_updated_at
  BEFORE UPDATE ON engineering_platform_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER engineering_platform_workflows_set_updated_at
  BEFORE UPDATE ON engineering_platform_workflows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
