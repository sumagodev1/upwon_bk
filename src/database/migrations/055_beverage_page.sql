-- Beverages & Juices industry page CMS: the hero slider.
--
-- The first section of the second industry page, on the same shape as the
-- Engineering & Manufacturing page's hero (048) - a slider whose slides each
-- carry their own pitch, so there is no one piece of copy to head them with.

CREATE TABLE beverage_hero_slides (
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

  CONSTRAINT beverage_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT beverage_hero_slides_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT beverage_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  CONSTRAINT beverage_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  -- A button is both halves or neither: a label with no destination is a dead
  -- link, and a destination with no label is invisible.
  CONSTRAINT beverage_hero_slides_cta_pair_check
    CHECK (num_nonnulls(cta_label, cta_href) <> 1),
  CONSTRAINT beverage_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT beverage_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(headline) <> '' AND btrim(subhead) <> ''
    )
);

CREATE INDEX idx_beverage_hero_slides_order ON beverage_hero_slides (display_order, created_at);
CREATE INDEX idx_beverage_hero_slides_status ON beverage_hero_slides (status);

CREATE TRIGGER beverage_hero_slides_set_updated_at
  BEFORE UPDATE ON beverage_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
