-- FMCG Distribution industry page CMS - the second industry page.
--
-- The same shapes as the Bakery & Confectionery page (041, 042) for the same
-- sections, less How UpWON Helps, which this page does not have:
--
--   hero                a slider whose slides each carry their own pitch
--   trust               a marquee of customer logos and a row of figures
--   connected platform  the product tiles, each linking to its product page
--   faq                 a list of questions
--   cta                 one closing band
--
-- Two differences from the bakery tables: a figure here carries a sentence of
-- explanation instead of an illustration, and the closing band has no row of
-- capability marks under its buttons.
--
-- Soft delete from the start, as 042 made it for the bakery page: a delete
-- stamps deleted_at, and every read and write filters on deleted_at IS NULL.
--
-- The copy that heads each section lives in page_section_copy under
-- ('fmcg', <section>). The section keys already exist; only the page key is new.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms', 'fms', 'bakery', 'fmcg'));

-- ── the hero slider ───────────────────────────────────────────────────────

CREATE TABLE fmcg_hero_slides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  eyebrow               VARCHAR(120)  NOT NULL,
  -- Authored text, not HTML: a newline is a line break and **like this** is the
  -- orange accent. Parsed server-side into headlineLines.
  headline              TEXT          NOT NULL,
  subhead               TEXT          NOT NULL,
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
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT fmcg_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fmcg_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT fmcg_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT fmcg_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT fmcg_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT fmcg_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_fmcg_hero_slides_status ON fmcg_hero_slides (status);
CREATE INDEX idx_fmcg_hero_slides_live
  ON fmcg_hero_slides (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the trust section ─────────────────────────────────────────────────────

CREATE TABLE fmcg_trust_logos (
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
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT fmcg_trust_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fmcg_trust_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT fmcg_trust_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT fmcg_trust_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_fmcg_trust_logos_status ON fmcg_trust_logos (status);
CREATE INDEX idx_fmcg_trust_logos_live
  ON fmcg_trust_logos (display_order, created_at) WHERE deleted_at IS NULL;

-- A figure is a value ("40%", "50–80%"), a short label, and the sentence under
-- it that says what the number means.
CREATE TABLE fmcg_trust_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  value             VARCHAR(40)   NOT NULL,
  label             VARCHAR(255)  NOT NULL,
  description       VARCHAR(400)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT fmcg_trust_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fmcg_trust_stats_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '' AND btrim(description) <> '')
);

CREATE INDEX idx_fmcg_trust_stats_status ON fmcg_trust_stats (status);
CREATE INDEX idx_fmcg_trust_stats_live
  ON fmcg_trust_stats (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the connected platform tiles ──────────────────────────────────────────

CREATE TABLE fmcg_platform_tiles (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  label             VARCHAR(80)   NOT NULL,
  href              VARCHAR(500)  NOT NULL,

  icon_url          VARCHAR(1000),
  icon_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT fmcg_platform_tiles_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fmcg_platform_tiles_single_icon_source_check
    CHECK (icon_url IS NULL OR icon_file_id IS NULL),
  CONSTRAINT fmcg_platform_tiles_icon_required_check
    CHECK (num_nonnulls(icon_url, icon_file_id) = 1),
  CONSTRAINT fmcg_platform_tiles_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(href) <> '')
);

CREATE INDEX idx_fmcg_platform_tiles_status ON fmcg_platform_tiles (status);
CREATE INDEX idx_fmcg_platform_tiles_live
  ON fmcg_platform_tiles (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the FAQ ───────────────────────────────────────────────────────────────

CREATE TABLE fmcg_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question        VARCHAR(500)  NOT NULL,
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT fmcg_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fmcg_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_fmcg_faq_entries_status ON fmcg_faq_entries (status);
CREATE INDEX idx_fmcg_faq_entries_live
  ON fmcg_faq_entries (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the closing band ──────────────────────────────────────────────────────
--
-- One record, replaced rather than deleted, so no deleted_at. The mobile crop
-- is optional: without one the page crops the desktop artwork into a banner.

CREATE TABLE fmcg_cta_section (
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

  CONSTRAINT fmcg_cta_section_singleton_check
    CHECK (singleton),
  CONSTRAINT fmcg_cta_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT fmcg_cta_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT fmcg_cta_section_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT fmcg_cta_section_primary_check
    CHECK (btrim(primary_label) <> '' AND btrim(primary_href) <> '')
);

-- ── updated_at triggers ───────────────────────────────────────────────────

CREATE TRIGGER fmcg_hero_slides_set_updated_at
  BEFORE UPDATE ON fmcg_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fmcg_trust_logos_set_updated_at
  BEFORE UPDATE ON fmcg_trust_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fmcg_trust_stats_set_updated_at
  BEFORE UPDATE ON fmcg_trust_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fmcg_platform_tiles_set_updated_at
  BEFORE UPDATE ON fmcg_platform_tiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fmcg_faq_entries_set_updated_at
  BEFORE UPDATE ON fmcg_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fmcg_cta_section_set_updated_at
  BEFORE UPDATE ON fmcg_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
