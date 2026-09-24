-- POS product page CMS: the hero slider, the FAQ and the closing band.
--
-- The first three sections of a fourth product page, on the same three shapes
-- the ERP, SFA-DMS and FMS pages already use - because the page renders the
-- same three things: a slider whose slides each carry their own pitch, a list
-- of questions, and one closing record.
--
-- The copy that heads the FAQ and the closing band is not here. It lives in
-- page_section_copy under ('pos', 'faq') and ('pos', 'cta') - which is why that
-- table's page-key check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms', 'fms', 'pos'));

-- -- the hero slider ---------------------------------------------------------
--
-- Each slide carries its own eyebrow, headline and subhead: the slider shows
-- five different pitches, so there is no one piece of copy to head them with.

CREATE TABLE pos_hero_slides (
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

  CONSTRAINT pos_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_hero_slides_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT pos_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  -- A button is both halves or neither: a label with no destination is a dead
  -- link, and a destination with no label is invisible.
  CONSTRAINT pos_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT pos_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT pos_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_pos_hero_slides_order ON pos_hero_slides (display_order, created_at);
CREATE INDEX idx_pos_hero_slides_status ON pos_hero_slides (status);

-- -- the FAQ -----------------------------------------------------------------

CREATE TABLE pos_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question        VARCHAR(500)  NOT NULL,
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_faq_entries_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_pos_faq_entries_order ON pos_faq_entries (display_order, created_at);
CREATE INDEX idx_pos_faq_entries_status ON pos_faq_entries (status);

-- -- the closing band --------------------------------------------------------
--
-- One record, not a list: the page closes on a single invitation. The singleton
-- column is what an upsert conflicts on, so the first save creates the row and
-- every later save replaces it.
--
-- Shaped like the FMS band - two crops of the same artwork and a footnote under
-- the buttons - with one field that band has no equivalent of: the handwritten
-- note the background arrow points at. Authored rather than fixed, because it
-- is copy, and stored with a newline for its line break, the same grammar every
-- other heading in this CMS uses.

CREATE TABLE pos_cta_section (
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

  /*
   * The handwritten note in the top right, drawn only from 1024px up. Optional:
   * the band reads correctly without it, and on a phone it is never shown at
   * all, so an empty value is a design choice rather than a hole.
   */
  note                      VARCHAR(160),

  created_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pos_cta_section_singleton_check
    CHECK (singleton),
  CONSTRAINT pos_cta_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT pos_cta_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT pos_cta_section_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT pos_cta_section_primary_check
    CHECK (btrim(primary_label) <> '' AND btrim(primary_href) <> ''),
  -- Absent is how the note is turned off; blank would draw an empty underline.
  CONSTRAINT pos_cta_section_note_check
    CHECK (note IS NULL OR btrim(note) <> '')
);

CREATE TRIGGER pos_hero_slides_set_updated_at
  BEFORE UPDATE ON pos_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pos_faq_entries_set_updated_at
  BEFORE UPDATE ON pos_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pos_cta_section_set_updated_at
  BEFORE UPDATE ON pos_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
