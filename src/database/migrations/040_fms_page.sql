-- FMS product page CMS: the hero slider, the FAQ and the closing band.
--
-- The same three shapes the SFA-DMS page has, because the page renders the same
-- three things: a slider whose slides each carry their own pitch, a list of
-- questions, and one closing record.
--
-- The copy that heads the FAQ and the closing band is not here. It lives in
-- page_section_copy under ('fms', 'faq') and ('fms', 'cta') - which is why that
-- table's page-key check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms', 'fms'));

-- ── the hero slider ───────────────────────────────────────────────────────
--
-- Each slide carries its own eyebrow, headline and subhead: the slider shows
-- four different pitches, so there is no one piece of copy to head them with.

CREATE TABLE fms_hero_slides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  eyebrow               VARCHAR(120)  NOT NULL,
  -- Authored text, not HTML: a newline is a line break and **like this** is the
  -- orange accent. Parsed server-side into headlineLines.
  headline              TEXT          NOT NULL,
  subhead               TEXT          NOT NULL,
  -- The small reassurance line under the buttons.
  micro_trust           VARCHAR(300),

  -- Both buttons are optional, and each needs both halves to be usable.
  cta_label             VARCHAR(120),
  cta_href              VARCHAR(500),
  secondary_label       VARCHAR(120),
  secondary_href        VARCHAR(500),

  -- The slide background, from one of two mutually exclusive sources.
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The portrait crop shown under 768px. Null falls back to the desktop image,
  -- which is what every slide does today.
  mobile_image_url      VARCHAR(1000),
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order         INTEGER       NOT NULL DEFAULT 0,
  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT fms_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  -- A button is both halves or neither: a label with no destination is a dead
  -- link, and a destination with no label is invisible.
  CONSTRAINT fms_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT fms_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT fms_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_fms_hero_slides_order ON fms_hero_slides (display_order, created_at);
CREATE INDEX idx_fms_hero_slides_status ON fms_hero_slides (status);

-- ── the FAQ ───────────────────────────────────────────────────────────────

CREATE TABLE fms_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question        VARCHAR(500)  NOT NULL,
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_fms_faq_entries_order ON fms_faq_entries (display_order, created_at);
CREATE INDEX idx_fms_faq_entries_status ON fms_faq_entries (status);

-- ── the closing band ──────────────────────────────────────────────────────
--
-- One record, not a list: the page closes on a single invitation. The singleton
-- column is what an upsert conflicts on, so the first save creates the row and
-- every later save replaces it.
--
-- Shaped differently from the SFA-DMS band, which carries a photograph and a
-- dashboard. This one has two crops of the same artwork - a wide one for
-- desktop and a tall one for phones - and it closes on a footnote under the
-- buttons.

CREATE TABLE fms_cta_section (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton                 BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The wide artwork, shown from 768px up.
  desktop_image_url         VARCHAR(1000),
  desktop_image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The tall crop phones actually download.
  mobile_image_url          VARCHAR(1000),
  mobile_image_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The filled button.
  primary_label             VARCHAR(120)  NOT NULL,
  primary_href              VARCHAR(500)  NOT NULL,
  -- The outlined one beside it. Both halves or neither.
  secondary_label           VARCHAR(120),
  secondary_href            VARCHAR(500),

  -- The reassurance line under the buttons.
  footnote                  VARCHAR(300),

  created_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_cta_section_singleton_check
    CHECK (singleton),
  CONSTRAINT fms_cta_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT fms_cta_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT fms_cta_section_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT fms_cta_section_primary_check
    CHECK (btrim(primary_label) <> '' AND btrim(primary_href) <> '')
);

CREATE TRIGGER fms_hero_slides_set_updated_at
  BEFORE UPDATE ON fms_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fms_faq_entries_set_updated_at
  BEFORE UPDATE ON fms_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fms_cta_section_set_updated_at
  BEFORE UPDATE ON fms_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
