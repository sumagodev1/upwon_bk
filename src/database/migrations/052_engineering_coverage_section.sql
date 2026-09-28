-- Engineering & Manufacturing industry page CMS: the industry coverage section.
--
-- "INDUSTRY COVERAGE - Built for a Wide Range of Engineering & Manufacturing
-- Businesses." Copy at the top left, a decorative illustration feathered into
-- the top right, and a grid of the business types UpWon serves.
--
-- Two tables, on the connected platform section's pattern: the panel is one
-- record (the background illustration), and the categories are a list an
-- editor adds to and reorders.
--
-- The eyebrow, heading and subtext live once in page_section_copy under
-- ('engineering-manufacturing', 'coverage'). The section key is new, so the
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

-- ── the background panel ──────────────────────────────────────────────────
--
-- One record. The singleton column is what an upsert conflicts on, so the
-- first save creates it and every later save replaces it.

CREATE TABLE engineering_coverage_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The illustration, from one of two mutually exclusive sources. Optional:
  -- with neither, the site keeps the illustration it ships. No alt text - it
  -- is decoration behind the copy, hidden from screen readers.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT engineering_coverage_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT engineering_coverage_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL)
);

-- ── the categories ────────────────────────────────────────────────────────
--
-- No colours: every card in the grid draws its icon in the same orange on the
-- same wash, so there is nothing per-row to author.

CREATE TABLE engineering_coverage_categories (
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

  CONSTRAINT engineering_coverage_categories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT engineering_coverage_categories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT engineering_coverage_categories_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_engineering_coverage_categories_order
  ON engineering_coverage_categories (display_order, created_at);
CREATE INDEX idx_engineering_coverage_categories_status
  ON engineering_coverage_categories (status);

CREATE TRIGGER engineering_coverage_panel_set_updated_at
  BEFORE UPDATE ON engineering_coverage_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER engineering_coverage_categories_set_updated_at
  BEFORE UPDATE ON engineering_coverage_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
