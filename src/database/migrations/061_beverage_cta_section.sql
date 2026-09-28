-- Beverages & Juices industry page CMS: the closing band.
--
-- "Ready to Bring Your Beverages & Juices Operations Together?" The same shape
-- as the Engineering page's band (054) - one record: two crops of the same
-- artwork and two buttons.
--
-- The copy lives in page_section_copy under ('beverage', 'cta'). Both keys are
-- already allowed, so no check widens here.

CREATE TABLE beverage_cta_section (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton                 BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The wide artwork, shown from 1024px up. Optional: with neither source the
  -- site keeps the artwork it ships.
  desktop_image_url         VARCHAR(1000),
  desktop_image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The portrait crop phones and tablets get, as a banner above the copy.
  mobile_image_url          VARCHAR(1000),
  mobile_image_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The filled button.
  primary_label             VARCHAR(120)  NOT NULL,
  primary_href              VARCHAR(500)  NOT NULL,
  -- The outlined one beside it. Both halves or neither.
  secondary_label           VARCHAR(120),
  secondary_href            VARCHAR(500),

  created_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT beverage_cta_section_singleton_check
    CHECK (singleton),
  CONSTRAINT beverage_cta_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT beverage_cta_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT beverage_cta_section_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT beverage_cta_section_primary_check
    CHECK (btrim(primary_label) <> '' AND btrim(primary_href) <> '')
);

CREATE TRIGGER beverage_cta_section_set_updated_at
  BEFORE UPDATE ON beverage_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
