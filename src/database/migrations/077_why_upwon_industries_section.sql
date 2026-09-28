-- Why UpWon page CMS: the industry trust section.
--
-- "Designed to Support Complex Manufacturing Operations." A heading over a row
-- of cards, one per manufacturing environment UpWon runs in: a photo, the
-- industry's name, and a link to the page that covers it. Several cards may
-- share one destination, which is deliberate.
--
-- The Spices & Agro page's coverage shape (066) - a photo and a name per row -
-- plus the link.
--
-- The copy lives in page_section_copy under ('why-upwon', 'industries'). Both
-- keys are already allowed, so no check widens here.

CREATE TABLE why_upwon_industries (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The photo, from one of two mutually exclusive sources.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The industry's name, shown under the photo.
  label             VARCHAR(120)  NOT NULL,
  -- Where the card leads: a site path or an absolute URL.
  href              VARCHAR(500)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT why_upwon_industries_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT why_upwon_industries_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT why_upwon_industries_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A card is its photo; one without is an empty frame.
  CONSTRAINT why_upwon_industries_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT why_upwon_industries_label_check
    CHECK (btrim(label) <> ''),
  CONSTRAINT why_upwon_industries_href_check
    CHECK (btrim(href) <> '')
);

CREATE INDEX idx_why_upwon_industries_order
  ON why_upwon_industries (display_order, created_at);
CREATE INDEX idx_why_upwon_industries_status
  ON why_upwon_industries (status);
CREATE INDEX idx_why_upwon_industries_image_file
  ON why_upwon_industries (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER why_upwon_industries_set_updated_at
  BEFORE UPDATE ON why_upwon_industries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
