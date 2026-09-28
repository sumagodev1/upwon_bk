-- Non-Food FMCG industry page CMS - the fifth industry page.
--
-- The FMCG Distribution page's five sections (043) - the trust figures are the
-- same value, label and explanation - plus three of this page's own:
--   - Core Capabilities: a row of cards, each an illustration, a title and a
--     description
--   - Benefits: a grid of benefits, each an icon and a label
--   - Industry Coverage: the dashboard image (one record) over a grid of
--     product categories, each an icon and a name
--
-- Icons are names from the page's allowlist, drawn with lucide-react on the
-- site. Soft delete from the start: a delete stamps deleted_at, and every read
-- and write filters on deleted_at IS NULL.
--
-- The copy that heads each section lives in page_section_copy under
-- ('non-food-fmcg', <section>). The section keys already exist (045).

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms', 'fms', 'bakery', 'fmcg', 'sweets', 'food-processing', 'non-food-fmcg'));

-- ── the hero slider ───────────────────────────────────────────────────────

CREATE TABLE non_food_fmcg_hero_slides (
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

  CONSTRAINT non_food_fmcg_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT non_food_fmcg_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT non_food_fmcg_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT non_food_fmcg_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT non_food_fmcg_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT non_food_fmcg_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_non_food_fmcg_hero_slides_status ON non_food_fmcg_hero_slides (status);
CREATE INDEX idx_non_food_fmcg_hero_slides_live
  ON non_food_fmcg_hero_slides (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the trust section ─────────────────────────────────────────────────────

CREATE TABLE non_food_fmcg_trust_logos (
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

  CONSTRAINT non_food_fmcg_trust_logos_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT non_food_fmcg_trust_logos_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT non_food_fmcg_trust_logos_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT non_food_fmcg_trust_logos_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE INDEX idx_non_food_fmcg_trust_logos_status ON non_food_fmcg_trust_logos (status);
CREATE INDEX idx_non_food_fmcg_trust_logos_live
  ON non_food_fmcg_trust_logos (display_order, created_at) WHERE deleted_at IS NULL;

-- A figure is a value ("2.5 Cr+", "Real-time"), a short title, and the sentence
-- under it that says what it covers.
CREATE TABLE non_food_fmcg_trust_stats (
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

  CONSTRAINT non_food_fmcg_trust_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT non_food_fmcg_trust_stats_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '' AND btrim(description) <> '')
);

CREATE INDEX idx_non_food_fmcg_trust_stats_status ON non_food_fmcg_trust_stats (status);
CREATE INDEX idx_non_food_fmcg_trust_stats_live
  ON non_food_fmcg_trust_stats (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the connected platform tiles ──────────────────────────────────────────

CREATE TABLE non_food_fmcg_platform_tiles (
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

  CONSTRAINT non_food_fmcg_platform_tiles_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT non_food_fmcg_platform_tiles_single_icon_source_check
    CHECK (icon_url IS NULL OR icon_file_id IS NULL),
  CONSTRAINT non_food_fmcg_platform_tiles_icon_required_check
    CHECK (num_nonnulls(icon_url, icon_file_id) = 1),
  CONSTRAINT non_food_fmcg_platform_tiles_not_blank_check
    CHECK (btrim(label) <> '' AND btrim(href) <> '')
);

CREATE INDEX idx_non_food_fmcg_platform_tiles_status ON non_food_fmcg_platform_tiles (status);
CREATE INDEX idx_non_food_fmcg_platform_tiles_live
  ON non_food_fmcg_platform_tiles (display_order, created_at) WHERE deleted_at IS NULL;

-- ── the FAQ ───────────────────────────────────────────────────────────────

CREATE TABLE non_food_fmcg_faq_entries (
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

  CONSTRAINT non_food_fmcg_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT non_food_fmcg_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_non_food_fmcg_faq_entries_status ON non_food_fmcg_faq_entries (status);
CREATE INDEX idx_non_food_fmcg_faq_entries_live
  ON non_food_fmcg_faq_entries (display_order, created_at) WHERE deleted_at IS NULL;

-- ── core capabilities ─────────────────────────────────────────────
--
-- One row per capability card: an illustration, a title and the sentence under it.

CREATE TABLE non_food_fmcg_capability_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  title             VARCHAR(120)  NOT NULL,
  description       VARCHAR(600)  NOT NULL,
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT non_food_fmcg_capability_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT non_food_fmcg_capability_cards_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT non_food_fmcg_capability_cards_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT non_food_fmcg_capability_cards_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '')
);

CREATE INDEX idx_non_food_fmcg_capability_cards_status ON non_food_fmcg_capability_cards (status);
CREATE INDEX idx_non_food_fmcg_capability_cards_live
  ON non_food_fmcg_capability_cards (display_order, created_at) WHERE deleted_at IS NULL;

CREATE TRIGGER non_food_fmcg_capability_cards_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_capability_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── benefits ─────────────────────────────────────────────
--
-- One row per benefit card: an icon and a short label.

CREATE TABLE non_food_fmcg_benefit_items (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws it with lucide-react.
  icon              VARCHAR(60)   NOT NULL,
  label             VARCHAR(120)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT non_food_fmcg_benefit_items_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT non_food_fmcg_benefit_items_not_blank_check
    CHECK (btrim(icon) <> '' AND btrim(label) <> '')
);

CREATE INDEX idx_non_food_fmcg_benefit_items_status ON non_food_fmcg_benefit_items (status);
CREATE INDEX idx_non_food_fmcg_benefit_items_live
  ON non_food_fmcg_benefit_items (display_order, created_at) WHERE deleted_at IS NULL;

CREATE TRIGGER non_food_fmcg_benefit_items_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_benefit_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── industry coverage ─────────────────────────────────────────────
--
-- One row per product category: an icon and a name.

CREATE TABLE non_food_fmcg_coverage_items (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws it with lucide-react.
  icon              VARCHAR(60)   NOT NULL,
  label             VARCHAR(120)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT non_food_fmcg_coverage_items_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT non_food_fmcg_coverage_items_not_blank_check
    CHECK (btrim(icon) <> '' AND btrim(label) <> '')
);

CREATE INDEX idx_non_food_fmcg_coverage_items_status ON non_food_fmcg_coverage_items (status);
CREATE INDEX idx_non_food_fmcg_coverage_items_live
  ON non_food_fmcg_coverage_items (display_order, created_at) WHERE deleted_at IS NULL;

CREATE TRIGGER non_food_fmcg_coverage_items_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_coverage_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The dashboard image between the copy and the categories. One record, replaced rather than deleted.
CREATE TABLE non_food_fmcg_coverage_panel (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton         BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  alt               VARCHAR(255)  NOT NULL,

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT non_food_fmcg_coverage_panel_singleton_check
    CHECK (singleton),
  CONSTRAINT non_food_fmcg_coverage_panel_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT non_food_fmcg_coverage_panel_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT non_food_fmcg_coverage_panel_alt_check
    CHECK (btrim(alt) <> '')
);

CREATE TRIGGER non_food_fmcg_coverage_panel_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_coverage_panel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── the closing band ──────────────────────────────────────────────────────
--
-- One record, replaced rather than deleted, so no deleted_at. Two crops of the
-- same artwork - wide for desktop, tall for the phone banner - and two buttons.

CREATE TABLE non_food_fmcg_cta_section (
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

  CONSTRAINT non_food_fmcg_cta_section_singleton_check
    CHECK (singleton),
  CONSTRAINT non_food_fmcg_cta_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT non_food_fmcg_cta_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT non_food_fmcg_cta_section_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT non_food_fmcg_cta_section_primary_check
    CHECK (btrim(primary_label) <> '' AND btrim(primary_href) <> '')
);

-- ── updated_at triggers ───────────────────────────────────────────────────

CREATE TRIGGER non_food_fmcg_hero_slides_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER non_food_fmcg_trust_logos_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_trust_logos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER non_food_fmcg_trust_stats_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_trust_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER non_food_fmcg_platform_tiles_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_platform_tiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER non_food_fmcg_faq_entries_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER non_food_fmcg_cta_section_set_updated_at
  BEFORE UPDATE ON non_food_fmcg_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
