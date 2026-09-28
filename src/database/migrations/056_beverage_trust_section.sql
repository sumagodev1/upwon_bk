-- Beverages & Juices industry page CMS: the trust section.
--
-- "Built to Keep Ingredients, Production, Quality, and Every Sales Channel
-- Connected." One heading over a two-row marquee of customer logos and a stat
-- card that turns over between photographed figures.
--
-- Two tables, on the Engineering page's pattern (049): the logos are the same
-- shape, and the stats differ - each is one figure over its own photograph,
-- where the Engineering cards pair two figures with an icon.
--
-- The copy lives in page_section_copy under ('beverage', 'trust'). The section
-- key is already allowed, but the page key is new, so that check widens first.

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

CREATE TABLE beverage_trust_logos (
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

  CONSTRAINT beverage_trust_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT beverage_trust_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT beverage_trust_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A logo row exists only to show one.
  CONSTRAINT beverage_trust_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT beverage_trust_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_beverage_trust_logos_order
  ON beverage_trust_logos (display_order, created_at);
CREATE INDEX idx_beverage_trust_logos_status ON beverage_trust_logos (status);
CREATE INDEX idx_beverage_trust_logos_image_file
  ON beverage_trust_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

-- ── the stats ─────────────────────────────────────────────────────────────
--
-- One row per figure. The card crossfades between their photographs, so the
-- photo belongs to the figure rather than to the card. Optional: without one
-- the figure sits on the card's dark ground.

CREATE TABLE beverage_trust_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The figure as it is read: "2.5 Cr+", "45+". Text, not a number.
  value             VARCHAR(40)   NOT NULL,
  label             VARCHAR(160)  NOT NULL,

  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT beverage_trust_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT beverage_trust_stats_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT beverage_trust_stats_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT beverage_trust_stats_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '')
);

CREATE INDEX idx_beverage_trust_stats_order
  ON beverage_trust_stats (display_order, created_at);
CREATE INDEX idx_beverage_trust_stats_status ON beverage_trust_stats (status);

CREATE TRIGGER beverage_trust_logos_set_updated_at
  BEFORE UPDATE ON beverage_trust_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER beverage_trust_stats_set_updated_at
  BEFORE UPDATE ON beverage_trust_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
