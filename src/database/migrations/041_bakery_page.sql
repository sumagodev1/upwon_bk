-- Bakery & Confectionery industry page CMS - the first of the industry pages.
--
-- Six sections, the same shapes the product pages use for the same things:
--
--   hero                a slider whose slides each carry their own pitch
--   trust               a row of customer logos and a strip of figures
--   connected platform  the product tiles, each linking to its product page
--   how UpWON helps     one full-width diagram, swapped with the status toggle
--   faq                 a list of questions
--   cta                 one closing band, and the four capability marks under it
--
-- The copy that heads each section (eyebrow, heading, subtext) is not here. It
-- lives in page_section_copy under ('bakery', <section>) - which is why that
-- table's page-key and section-key checks widen first.
--
-- Deletes are hard, as on every other CMS page: deactivating is how an editor
-- takes something off the site while keeping it.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms', 'fms', 'bakery'));

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_section_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_section_key_check
    CHECK (section_key IN (
      -- home page
      'trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta',
      -- ERP product page
      'hero', 'recognition', 'benefits', 'alternatives', 'outcomes', 'establishers',
      -- SFA-DMS product page
      'proof', 'video', 'packages',
      -- Bakery & Confectionery industry page
      'platform', 'helps'
    ));

-- ── the hero slider ───────────────────────────────────────────────────────
--
-- Same shape as fms_hero_slides: each slide carries its own eyebrow, headline
-- and subhead, so there is no one piece of copy to head them with.

CREATE TABLE bakery_hero_slides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  eyebrow               VARCHAR(120)  NOT NULL,
  -- Authored text, not HTML: a newline is a line break and **like this** is the
  -- orange accent. Parsed server-side into headlineLines.
  headline              TEXT          NOT NULL,
  subhead               TEXT          NOT NULL,
  -- The small reassurance line under the buttons. The bakery slides ship
  -- without one; the column is here so a slide can gain one.
  micro_trust           VARCHAR(300),

  cta_label             VARCHAR(120),
  cta_href              VARCHAR(500),
  secondary_label       VARCHAR(120),
  secondary_href        VARCHAR(500),

  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,
  mobile_image_url      VARCHAR(1000),
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT bakery_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT bakery_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT bakery_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT bakery_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT bakery_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT bakery_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_bakery_hero_slides_order ON bakery_hero_slides (display_order, created_at);
CREATE INDEX idx_bakery_hero_slides_status ON bakery_hero_slides (status);

-- ── the trust section ─────────────────────────────────────────────────────
--
-- Two lists under one heading: the customer logos and the strip of figures.
-- Two tables, because a logo is added the day a brand goes live and a figure
-- is revised when the quarter's numbers land - different edits on different
-- days, the same split as sfa_proof_logos and sfa_proof_stats.

CREATE TABLE bakery_trust_logos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

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

  CONSTRAINT bakery_trust_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT bakery_trust_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A logo row exists only to show a mark, so one with no image is nothing.
  CONSTRAINT bakery_trust_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT bakery_trust_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_bakery_trust_logos_order ON bakery_trust_logos (display_order, created_at);
CREATE INDEX idx_bakery_trust_logos_status ON bakery_trust_logos (status);

-- The figure is text rather than a number: "25,000+" and "2.5 Cr+" are written
-- the way they are read, and the strip renders them verbatim.
CREATE TABLE bakery_trust_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  value             VARCHAR(40)   NOT NULL,
  label             VARCHAR(255)  NOT NULL,

  -- The round illustration above the figure. Optional: without one the cell
  -- reads as a plain figure, which is a design rather than a hole.
  icon_url          VARCHAR(1000),
  icon_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The highlighted cell - a lighter ground and the underline beneath it.
  is_featured       BOOLEAN       NOT NULL DEFAULT FALSE,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT bakery_trust_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT bakery_trust_stats_single_icon_source_check
    CHECK (icon_url IS NULL OR icon_file_id IS NULL),
  CONSTRAINT bakery_trust_stats_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '')
);

CREATE INDEX idx_bakery_trust_stats_order ON bakery_trust_stats (display_order, created_at);
CREATE INDEX idx_bakery_trust_stats_status ON bakery_trust_stats (status);

-- ── the connected platform tiles ──────────────────────────────────────────
--
-- One tile per product, each linking through to that product's page.

CREATE TABLE bakery_platform_tiles (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  label             VARCHAR(80)   NOT NULL,
  -- Where the tile goes. Required: a tile is a link, and one with nowhere to go
  -- is a dead button.
  href              VARCHAR(500)  NOT NULL,

  -- The product mark in the tile, from one of two mutually exclusive sources.
  icon_url          VARCHAR(1000),
  icon_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT bakery_platform_tiles_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT bakery_platform_tiles_single_icon_source_check
    CHECK (icon_url IS NULL OR icon_file_id IS NULL),
  CONSTRAINT bakery_platform_tiles_icon_required_check
    CHECK (num_nonnulls(icon_url, icon_file_id) = 1),
  CONSTRAINT bakery_platform_tiles_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(href) <> '')
);

CREATE INDEX idx_bakery_platform_tiles_order ON bakery_platform_tiles (display_order, created_at);
CREATE INDEX idx_bakery_platform_tiles_status ON bakery_platform_tiles (status);

-- ── how UpWON helps ───────────────────────────────────────────────────────
--
-- One full-width diagram under the section copy. A list rather than a
-- singleton, with one row live at a time - the same arrangement as
-- sfa_video_entries, and for the same reason: a replacement diagram can be
-- uploaded and checked beside the live one, then switched over with the status
-- toggle rather than written over the top of it.

CREATE TABLE bakery_help_visuals (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The diagram carries the section's content, so its description is required.
  alt               VARCHAR(255)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT bakery_help_visuals_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT bakery_help_visuals_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT bakery_help_visuals_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT bakery_help_visuals_alt_check
    CHECK (btrim(alt) <> '')
);

/*
 * One diagram live at a time - the section renders a single image, so a second
 * active row would be silently invisible. A partial unique index rather than
 * only a service check, so two administrators activating different rows at the
 * same moment cannot both commit.
 */
CREATE UNIQUE INDEX bakery_help_visuals_one_active_idx
  ON bakery_help_visuals ((status))
  WHERE status = 'ACTIVE';

CREATE INDEX idx_bakery_help_visuals_order ON bakery_help_visuals (display_order, created_at);

-- ── the FAQ ───────────────────────────────────────────────────────────────

CREATE TABLE bakery_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question        VARCHAR(500)  NOT NULL,
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT bakery_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT bakery_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_bakery_faq_entries_order ON bakery_faq_entries (display_order, created_at);
CREATE INDEX idx_bakery_faq_entries_status ON bakery_faq_entries (status);

-- ── the closing band ──────────────────────────────────────────────────────
--
-- One record, the same shape as fms_cta_section less its footnote: a wide
-- artwork for desktop, a tall crop for phones, and two buttons.

CREATE TABLE bakery_cta_section (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton                 BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  desktop_image_url         VARCHAR(1000),
  desktop_image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  mobile_image_url          VARCHAR(1000),
  mobile_image_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  primary_label             VARCHAR(120)  NOT NULL,
  primary_href              VARCHAR(500)  NOT NULL,
  secondary_label           VARCHAR(120),
  secondary_href            VARCHAR(500),

  created_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT bakery_cta_section_singleton_check
    CHECK (singleton),
  CONSTRAINT bakery_cta_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT bakery_cta_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT bakery_cta_section_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT bakery_cta_section_primary_check
    CHECK (btrim(primary_label) <> '' AND btrim(primary_href) <> '')
);

-- The capability marks under the buttons: "Streamline / Procurement" and its
-- three siblings. A list, so a fifth can be added or one retired.
CREATE TABLE bakery_cta_features (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,
  label             VARCHAR(60)   NOT NULL,
  sub_label         VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT bakery_cta_features_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT bakery_cta_features_not_blank_check
    CHECK (btrim(icon) <> '' AND btrim(label) <> '' AND btrim(sub_label) <> '')
);

CREATE INDEX idx_bakery_cta_features_order ON bakery_cta_features (display_order, created_at);
CREATE INDEX idx_bakery_cta_features_status ON bakery_cta_features (status);

-- ── updated_at triggers ───────────────────────────────────────────────────

CREATE TRIGGER bakery_hero_slides_set_updated_at
  BEFORE UPDATE ON bakery_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bakery_trust_logos_set_updated_at
  BEFORE UPDATE ON bakery_trust_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bakery_trust_stats_set_updated_at
  BEFORE UPDATE ON bakery_trust_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bakery_platform_tiles_set_updated_at
  BEFORE UPDATE ON bakery_platform_tiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bakery_help_visuals_set_updated_at
  BEFORE UPDATE ON bakery_help_visuals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bakery_faq_entries_set_updated_at
  BEFORE UPDATE ON bakery_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bakery_cta_section_set_updated_at
  BEFORE UPDATE ON bakery_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bakery_cta_features_set_updated_at
  BEFORE UPDATE ON bakery_cta_features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
