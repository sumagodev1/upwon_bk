-- Why UpWon page CMS: the hero.
--
-- The first section of the /why-upwon page. Not a slider like the industry
-- pages' heroes: one split hero - the artwork on one side, the copy in the space
-- it leaves - so one record, the same shape as the industry pages' closing
-- bands (054, 061, 068, 075): two crops of the same artwork and two buttons,
-- plus a description of the artwork, which here is the page's first content.
--
-- The eyebrow, heading and subtext live in page_section_copy under
-- ('why-upwon', 'hero'). The section key is already allowed - the ERP page uses
-- it - but the page key is new, so that check widens first.

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

CREATE TABLE why_upwon_hero_section (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton                 BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The wide artwork, shown from 1024px up. Optional: with neither source the
  -- site keeps the artwork it ships.
  desktop_image_url         VARCHAR(1000),
  desktop_image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The portrait crop phones and tablets get, with the copy under it.
  mobile_image_url          VARCHAR(1000),
  mobile_image_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- Read aloud in place of the artwork. Required: it shows the product.
  image_alt                 VARCHAR(300)  NOT NULL,

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

  CONSTRAINT why_upwon_hero_section_singleton_check
    CHECK (singleton),
  CONSTRAINT why_upwon_hero_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT why_upwon_hero_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT why_upwon_hero_section_alt_check
    CHECK (btrim(image_alt) <> ''),
  CONSTRAINT why_upwon_hero_section_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT why_upwon_hero_section_primary_check
    CHECK (btrim(primary_label) <> '' AND btrim(primary_href) <> '')
);

CREATE TRIGGER why_upwon_hero_section_set_updated_at
  BEFORE UPDATE ON why_upwon_hero_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
