-- Sweets & Namkeen industry page CMS - the third industry page.
--
-- The same five sections, and the same shapes, as the FMCG Distribution page
-- (043), with one difference: a trust figure carries an icon - a name from the
-- page's allowlist, drawn with lucide-react on the site - rather than a
-- sentence of explanation.
--
-- Soft delete from the start: a delete stamps deleted_at, and every read and
-- write filters on deleted_at IS NULL.
--
-- The copy that heads each section lives in page_section_copy under
-- ('sweets', <section>). The section keys already exist; only the page key is new.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms', 'fms', 'bakery', 'fmcg', 'sweets'));

-- ── the hero slider ───────────────────────────────────────────────────────

CREATE TABLE sweets_hero_slides (
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

  CONSTRAINT sweets_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sweets_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT sweets_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT sweets_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT sweets_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT sweets_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_sweets_hero_slides_status ON sweets_hero_slides (status);
CREATE INDEX idx_sweets_hero_slides_live
  ON sweets_hero_slides (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the trust section ─────────────────────────────────────────────────────

CREATE TABLE sweets_trust_logos (
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

  CONSTRAINT sweets_trust_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sweets_trust_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT sweets_trust_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT sweets_trust_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_sweets_trust_logos_status ON sweets_trust_logos (status);
CREATE INDEX idx_sweets_trust_logos_live
  ON sweets_trust_logos (display_order, created_at) WHERE deleted_at IS NULL;

-- A figure is a value ("25,000+", "3 Lakh+"), a short label, and the icon drawn
-- above them - a name from the allowlist, not a file.
CREATE TABLE sweets_trust_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  value             VARCHAR(40)   NOT NULL,
  label             VARCHAR(255)  NOT NULL,
  icon              VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT sweets_trust_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sweets_trust_stats_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '' AND btrim(icon) <> '')
);

CREATE INDEX idx_sweets_trust_stats_status ON sweets_trust_stats (status);
CREATE INDEX idx_sweets_trust_stats_live
  ON sweets_trust_stats (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the connected platform tiles ──────────────────────────────────────────

CREATE TABLE sweets_platform_tiles (
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

  CONSTRAINT sweets_platform_tiles_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sweets_platform_tiles_single_icon_source_check
    CHECK (icon_url IS NULL OR icon_file_id IS NULL),
  CONSTRAINT sweets_platform_tiles_icon_required_check
    CHECK (num_nonnulls(icon_url, icon_file_id) = 1),
  CONSTRAINT sweets_platform_tiles_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(href) <> '')
);

CREATE INDEX idx_sweets_platform_tiles_status ON sweets_platform_tiles (status);
CREATE INDEX idx_sweets_platform_tiles_live
  ON sweets_platform_tiles (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the FAQ ───────────────────────────────────────────────────────────────

CREATE TABLE sweets_faq_entries (
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

  CONSTRAINT sweets_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sweets_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_sweets_faq_entries_status ON sweets_faq_entries (status);
CREATE INDEX idx_sweets_faq_entries_live
  ON sweets_faq_entries (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the closing band ──────────────────────────────────────────────────────
--
-- One record, replaced rather than deleted, so no deleted_at. Two crops of the
-- same artwork - wide for desktop, tall for the phone banner - and two buttons.

CREATE TABLE sweets_cta_section (
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

  CONSTRAINT sweets_cta_section_singleton_check
    CHECK (singleton),
  CONSTRAINT sweets_cta_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT sweets_cta_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT sweets_cta_section_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT sweets_cta_section_primary_check
    CHECK (btrim(primary_label) <> '' AND btrim(primary_href) <> '')
);

-- ── updated_at triggers ───────────────────────────────────────────────────

CREATE TRIGGER sweets_hero_slides_set_updated_at
  BEFORE UPDATE ON sweets_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sweets_trust_logos_set_updated_at
  BEFORE UPDATE ON sweets_trust_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sweets_trust_stats_set_updated_at
  BEFORE UPDATE ON sweets_trust_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sweets_platform_tiles_set_updated_at
  BEFORE UPDATE ON sweets_platform_tiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sweets_faq_entries_set_updated_at
  BEFORE UPDATE ON sweets_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sweets_cta_section_set_updated_at
  BEFORE UPDATE ON sweets_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
