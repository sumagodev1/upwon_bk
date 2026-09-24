-- ERP product page CMS: the hero slider, the FAQ accordion and the closing band.
--
-- Same shapes as the home page's equivalents, deliberately: a list section is
-- one table with one row per entry, a singleton is one table with one row, and
-- the eyebrow / heading / subtext that head a section live once in
-- page_section_copy under ('erp', <section>).
--
-- The ERP trust strip gets no table here. The page overrides only that
-- section's copy - its logos and counters are the shared component's own - so
-- its copy row in page_section_copy is the whole of it.

-- ── Hero slider ──────────────────────────────────────────────────────────
--
-- Unlike the home page's hero, whose slides each carry their own copy, these
-- share the section's eyebrow only in the sense that each slide has its own.
-- They are per-slide here too, because the slider shows five different pitches.

CREATE TABLE erp_hero_slides (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  eyebrow           VARCHAR(120)  NOT NULL,

  -- Same authored-text grammar as every other heading in the CMS:
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  headline          TEXT          NOT NULL,
  subhead           TEXT          NOT NULL,

  -- The reassurance line under the buttons. Shared wording across slides in
  -- practice, but stored per slide so one can differ.
  micro_trust       VARCHAR(300),

  -- Primary and secondary buttons. A label with no target is meaningless, so
  -- the two are required together or absent together.
  cta_label         VARCHAR(120),
  cta_href          VARCHAR(500),
  secondary_label   VARCHAR(120),
  secondary_href    VARCHAR(500),

  -- The slide's background, from one of two mutually exclusive sources.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT erp_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_hero_slides_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT erp_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT erp_hero_slides_cta_pair_check
    CHECK ((cta_label IS NULL) = (cta_href IS NULL)),
  CONSTRAINT erp_hero_slides_secondary_pair_check
    CHECK ((secondary_label IS NULL) = (secondary_href IS NULL)),
  CONSTRAINT erp_hero_slides_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> '')
);

CREATE INDEX erp_hero_slides_published_idx
  ON erp_hero_slides (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE INDEX erp_hero_slides_image_file_idx
  ON erp_hero_slides (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER erp_hero_slides_set_updated_at
  BEFORE UPDATE ON erp_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── FAQ ──────────────────────────────────────────────────────────────────

CREATE TABLE erp_faq_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  question        VARCHAR(300)  NOT NULL,
  -- Plain text: the accordion renders it into a <p>, so markup would show
  -- literally and the heading grammar deliberately does not apply here.
  answer          TEXT          NOT NULL,

  display_order   INTEGER       NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT erp_faq_entries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT erp_faq_entries_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT erp_faq_entries_qa_not_blank_check
    CHECK (btrim(question) <> '' AND btrim(answer) <> '')
);

CREATE INDEX erp_faq_entries_published_idx
  ON erp_faq_entries (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE TRIGGER erp_faq_entries_set_updated_at
  BEFORE UPDATE ON erp_faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Closing call to action ───────────────────────────────────────────────
--
-- A singleton, like the home page's report band: the page has one of these,
-- so there is nothing to order, activate or page through.

CREATE TABLE erp_cta_section (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton               BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The band is laid out twice, so two backgrounds: bg-cover on both, but the
  -- mobile one is a separate crop.
  desktop_image_url       VARCHAR(1000),
  desktop_image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,
  mobile_image_url        VARCHAR(1000),
  mobile_image_file_id    UUID          REFERENCES files(id) ON DELETE SET NULL,

  button_label            VARCHAR(120)  NOT NULL,
  button_href             VARCHAR(500)  NOT NULL,

  updated_by              UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT erp_cta_section_singleton_check
    CHECK (singleton),
  CONSTRAINT erp_cta_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT erp_cta_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  CONSTRAINT erp_cta_section_button_not_blank_check
    CHECK (btrim(button_label) <> '' AND btrim(button_href) <> '')
);

CREATE INDEX erp_cta_section_desktop_file_idx
  ON erp_cta_section (desktop_image_file_id)
  WHERE desktop_image_file_id IS NOT NULL;

CREATE INDEX erp_cta_section_mobile_file_idx
  ON erp_cta_section (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

CREATE TRIGGER erp_cta_section_set_updated_at
  BEFORE UPDATE ON erp_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
