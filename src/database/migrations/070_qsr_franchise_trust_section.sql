-- QSR & Franchise F&B industry page CMS: the trust section.
--
-- "Built to Keep Central Kitchens, Outlets, Franchise Networks, and Every F&B
-- Operation Connected." A heading over a marquee of customer logos, and a
-- mosaic under it of three stat tiles and two photographs.
--
-- Three tables. The logos are the same shape as the other industry pages'
-- (056, 063). Each stat tile is a figure, what it counts, a line about it and
-- an icon. The two photographs are one record, so they sit in a panel table
-- read and replaced as a whole.
--
-- The copy lives in page_section_copy under ('qsr-franchise', 'trust'). The
-- section key is already allowed, but the page key is new, so that check
-- widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN (
      'home', 'erp', 'sfa-dms', 'fms', 'pos', 'engineering-manufacturing', 'beverage',
      'spices-agro', 'qsr-franchise'
    ));

-- ── the logo marquee ──────────────────────────────────────────────────────

CREATE TABLE qsr_franchise_trust_logos (
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

  CONSTRAINT qsr_franchise_trust_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT qsr_franchise_trust_logos_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT qsr_franchise_trust_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A logo row exists only to show one.
  CONSTRAINT qsr_franchise_trust_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT qsr_franchise_trust_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_qsr_franchise_trust_logos_order
  ON qsr_franchise_trust_logos (display_order, created_at);
CREATE INDEX idx_qsr_franchise_trust_logos_status ON qsr_franchise_trust_logos (status);
CREATE INDEX idx_qsr_franchise_trust_logos_image_file
  ON qsr_franchise_trust_logos (image_file_id)
  WHERE image_file_id IS NOT NULL;

-- ── the stat tiles ────────────────────────────────────────────────────────

CREATE TABLE qsr_franchise_trust_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The figure as it is read: "2.5 Cr+", "18,000+". Text, not a number.
  value             VARCHAR(40)   NOT NULL,
  label             VARCHAR(160)  NOT NULL,
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

  CONSTRAINT qsr_franchise_trust_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT qsr_franchise_trust_stats_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT qsr_franchise_trust_stats_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '' AND btrim(description) <> ''
           AND btrim(icon) <> '')
);

CREATE INDEX idx_qsr_franchise_trust_stats_order
  ON qsr_franchise_trust_stats (display_order, created_at);
CREATE INDEX idx_qsr_franchise_trust_stats_status ON qsr_franchise_trust_stats (status);

-- ── the photographs ───────────────────────────────────────────────────────
--
-- The small tile under the first figure, and the tall panel down the right.
-- Each optional: with neither source the site keeps the one it ships there.

CREATE TABLE qsr_franchise_trust_panel (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton             BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  small_image_url       VARCHAR(1000),
  small_image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,
  tall_image_url        VARCHAR(1000),
  tall_image_file_id    UUID          REFERENCES files(id) ON DELETE SET NULL,

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT qsr_franchise_trust_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT qsr_franchise_trust_panel_small_single_source_check
    CHECK (small_image_url IS NULL OR small_image_file_id IS NULL),
  CONSTRAINT qsr_franchise_trust_panel_tall_single_source_check
    CHECK (tall_image_url IS NULL OR tall_image_file_id IS NULL)
);

CREATE TRIGGER qsr_franchise_trust_logos_set_updated_at
  BEFORE UPDATE ON qsr_franchise_trust_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER qsr_franchise_trust_stats_set_updated_at
  BEFORE UPDATE ON qsr_franchise_trust_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER qsr_franchise_trust_panel_set_updated_at
  BEFORE UPDATE ON qsr_franchise_trust_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
