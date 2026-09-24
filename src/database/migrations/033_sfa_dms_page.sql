-- SFA-DMS product page CMS: the hero slider, the FAQ and the closing band.
--
-- The same three shapes the ERP page has, because the page renders the same
-- three things: a slider whose slides each carry their own pitch, a list of
-- questions, and one closing record.
--
-- The copy that heads the FAQ and the closing band is not here. It lives in
-- page_section_copy under ('sfa-dms', 'faq') and ('sfa-dms', 'cta') - which is
-- why that table's page-key check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms'));

-- ── the hero slider ───────────────────────────────────────────────────────
--
-- Each slide carries its own eyebrow, headline and subhead: the slider shows
-- five different pitches, so there is no one piece of copy to head them with.

CREATE TABLE sfa_hero_slides (
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

  CONSTRAINT sfa_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sfa_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT sfa_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  -- A button is both halves or neither; half of one renders as a dead control.
  CONSTRAINT sfa_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT sfa_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT sfa_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_sfa_hero_slides_order ON sfa_hero_slides (display_order, created_at);
CREATE INDEX idx_sfa_hero_slides_status ON sfa_hero_slides (status);

-- ── the FAQ ───────────────────────────────────────────────────────────────

CREATE TABLE sfa_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question        VARCHAR(300)  NOT NULL,
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sfa_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_sfa_faq_entries_order ON sfa_faq_entries (display_order, created_at);
CREATE INDEX idx_sfa_faq_entries_status ON sfa_faq_entries (status);

-- ── the closing band ──────────────────────────────────────────────────────
--
-- One record, not a list: the page closes on a single invitation. The singleton
-- column is the standard trick - UNIQUE on a column that can only be TRUE, so
-- an upsert has something to conflict on.
--
-- Two images rather than the ERP band's desktop/mobile pair, because this band
-- is shaped differently: a photograph behind the whole band, and the product
-- dashboard peeking up from the bottom.

CREATE TABLE sfa_cta_section (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton                 BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The photograph behind the band.
  background_image_url      VARCHAR(1000),
  background_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The dashboard screenshot along the bottom edge.
  dashboard_image_url       VARCHAR(1000),
  dashboard_image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,
  dashboard_alt             VARCHAR(255),

  button_label              VARCHAR(120)  NOT NULL,
  button_href               VARCHAR(500)  NOT NULL,

  created_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT sfa_cta_section_singleton_check
    CHECK (singleton),
  CONSTRAINT sfa_cta_section_single_background_source_check
    CHECK (background_image_url IS NULL OR background_image_file_id IS NULL),
  CONSTRAINT sfa_cta_section_single_dashboard_source_check
    CHECK (dashboard_image_url IS NULL OR dashboard_image_file_id IS NULL),
  CONSTRAINT sfa_cta_section_button_check
    CHECK (btrim(button_label) <> '' AND btrim(button_href) <> '')
);
