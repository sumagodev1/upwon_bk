-- Spices & Agro Processing industry page CMS: the trust section.
--
-- "Built to Keep Raw Materials, Processing, Quality, Warehouses, and Every
-- Sales Channel Connected." A centred heading over a marquee of customer logos
-- and a product screenshot under it.
--
-- The logos are the same shape as the Beverages page's (056). There are no
-- stats here; the screenshot is one record, so it sits in a panel table read
-- and replaced as a whole.
--
-- The copy lives in page_section_copy under ('spices-agro', 'trust'). The
-- section key is already allowed, but the page key is new, so that check
-- widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN (
    -- Merge union: three branches each re-declared this list with only their
    -- own pages, so the last to run erased the rest. Every key the codebase
    -- declares is listed here - see PAGE_SECTION_KEYS in src/config/constants.ts.
      'home', 'erp', 'sfa-dms', 'fms', 'pos', 'hreasy', 'wms', 'vms', 'bakery', 'fmcg',
      'sweets', 'food-processing', 'non-food-fmcg', 'dairy', 'engineering-manufacturing',
      'beverage', 'spices-agro', 'qsr-franchise', 'why-upwon', 'clients'
    ));

-- ── the logo marquee ──────────────────────────────────────────────────────

CREATE TABLE spices_agro_trust_logos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The mark, from one of two mutually exclusive sources.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The brand name, read aloud by a screen reader in place of the image.
  alt               VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT spices_agro_trust_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT spices_agro_trust_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT spices_agro_trust_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A logo row exists only to show one.
  CONSTRAINT spices_agro_trust_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT spices_agro_trust_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_spices_agro_trust_logos_order
  ON spices_agro_trust_logos (display_order, created_at);
CREATE INDEX idx_spices_agro_trust_logos_status ON spices_agro_trust_logos (status);
CREATE INDEX idx_spices_agro_trust_logos_image_file
  ON spices_agro_trust_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

-- ── the product panel ─────────────────────────────────────────────────────

CREATE TABLE spices_agro_trust_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The screenshot, from one of two mutually exclusive sources. Optional:
  -- with neither, the site keeps the one it ships.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- Read aloud in place of the screenshot. Required: it shows the product.
  image_alt         VARCHAR(300)  NOT NULL,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT spices_agro_trust_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT spices_agro_trust_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT spices_agro_trust_panel_alt_check
    CHECK (btrim(image_alt) <> '')
);

CREATE TRIGGER spices_agro_trust_logos_set_updated_at
  BEFORE UPDATE ON spices_agro_trust_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER spices_agro_trust_panel_set_updated_at
  BEFORE UPDATE ON spices_agro_trust_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
