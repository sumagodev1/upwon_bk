-- WMS product page CMS: the hero slider, the FAQ and the closing band.
--
-- The first three sections of a sixth product page, and the same three shapes
-- the HREasy page opened with: a slider whose slides each carry their own
-- pitch, an accordion, and a closing band with two icon buttons over a
-- four-item trust strip.
--
-- One difference from the HREasy band, and it is in the artwork: this one is
-- a left-aligned block over a full-bleed photograph with a separate phone
-- crop, where HREasy centres its copy over a single image. So the band keeps
-- a desktop/mobile pair here rather than one banner.
--
-- The copy that heads the FAQ and the closing band is not here. It lives in
-- page_section_copy under ('wms', 'faq') and ('wms', 'cta') - which is why
-- that table's page-key check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_page_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_page_key_check
    CHECK (page_key IN ('home', 'erp', 'sfa-dms', 'fms', 'pos', 'hreasy', 'wms'));

-- ── the hero slider ───────────────────────────────────────────────────────
--
-- Each slide carries its own eyebrow, headline and subhead: the slider shows
-- five different pitches, so there is no one piece of copy to head them with.

CREATE TABLE wms_hero_slides (
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

  CONSTRAINT wms_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT wms_hero_slides_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT wms_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT wms_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  -- A button is both halves or neither: a label with no destination is a dead
  -- link, and a destination with no label is invisible.
  CONSTRAINT wms_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT wms_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT wms_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_wms_hero_slides_order ON wms_hero_slides (display_order, created_at);
CREATE INDEX idx_wms_hero_slides_status ON wms_hero_slides (status);

-- ── the FAQ ───────────────────────────────────────────────────────────────

CREATE TABLE wms_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question        VARCHAR(500)  NOT NULL,
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT wms_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT wms_faq_entries_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT wms_faq_entries_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX idx_wms_faq_entries_order ON wms_faq_entries (display_order, created_at);
CREATE INDEX idx_wms_faq_entries_status ON wms_faq_entries (status);

-- ── the closing band ──────────────────────────────────────────────────────
--
-- One record, because the page draws one band. The eyebrow, heading and
-- subtext over it live in page_section_copy under ('wms', 'cta').

CREATE TABLE wms_cta_section (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What an upsert conflicts on, so the first save creates the row and every
  -- later save replaces it.
  singleton             BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  /*
   * The photograph behind the band, from one of two mutually exclusive
   * sources, and its phone crop from another pair.
   *
   * Two images, unlike the HREasy band's one: this design lays its copy over
   * the left of a full-bleed landscape photograph, and that crop keeps
   * nothing readable on a phone - hence a separate portrait source.
   *
   * Both optional. Without them the band falls back to its cream ground,
   * which is a working design rather than a hole.
   */
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,
  mobile_image_url      VARCHAR(1000),
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  /*
   * Both buttons, each with an icon name from the page's allowlist. The first
   * is required: a closing band with no way to act on it is the one section
   * on the page that has nothing else to offer. The second is optional - the
   * band reads fine with one.
   */
  primary_label         VARCHAR(120)  NOT NULL,
  primary_href          VARCHAR(500)  NOT NULL,
  primary_icon          VARCHAR(60)   NOT NULL,
  secondary_label       VARCHAR(120),
  secondary_href        VARCHAR(500),
  secondary_icon        VARCHAR(60),

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT wms_cta_section_singleton_check
    CHECK (singleton = TRUE),
  CONSTRAINT wms_cta_section_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT wms_cta_section_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  /*
   * The second button is all three parts or none of them: a label with no
   * destination is a dead link, and a destination with no label is invisible.
   */
  CONSTRAINT wms_cta_section_secondary_trio_check
    CHECK (num_nonnulls(secondary_label, secondary_href, secondary_icon) IN (0, 3)),
  CONSTRAINT wms_cta_section_not_blank_check
    CHECK (
      btrim(primary_label) <> '' AND btrim(primary_href) <> ''
      AND btrim(primary_icon) <> ''
    )
);

-- ── the trust strip ───────────────────────────────────────────────────────
--
-- The four reassurances under the buttons. Each is an icon and two short
-- lines, drawn one above the other - two columns rather than one string,
-- because the break is deliberate and a single field would leave an editor
-- guessing where it falls.

CREATE TABLE wms_cta_trust_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  icon            VARCHAR(60)   NOT NULL,
  line_one        VARCHAR(120)  NOT NULL,
  line_two        VARCHAR(120)  NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT wms_cta_trust_items_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT wms_cta_trust_items_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT wms_cta_trust_items_not_blank_check
    CHECK (btrim(icon) <> '' AND btrim(line_one) <> '' AND btrim(line_two) <> '')
);

CREATE INDEX idx_wms_cta_trust_items_order
  ON wms_cta_trust_items (display_order, created_at);
CREATE INDEX idx_wms_cta_trust_items_status
  ON wms_cta_trust_items (status);

CREATE INDEX idx_wms_cta_section_image_file
  ON wms_cta_section (image_file_id)
  WHERE image_file_id IS NOT NULL;
CREATE INDEX idx_wms_cta_section_mobile_image_file
  ON wms_cta_section (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

CREATE TRIGGER wms_hero_slides_set_updated_at
  BEFORE UPDATE ON wms_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER wms_faq_entries_set_updated_at
  BEFORE UPDATE ON wms_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER wms_cta_section_set_updated_at
  BEFORE UPDATE ON wms_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER wms_cta_trust_items_set_updated_at
  BEFORE UPDATE ON wms_cta_trust_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
