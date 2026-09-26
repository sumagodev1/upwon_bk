-- QSR & Franchise F&B industry page CMS: the industry coverage section.
--
-- "Built for a Wide Range of QSR & Franchise F&B Businesses." A heading over a
-- drifting row of cards, one per business format: a photo with an icon badge
-- on its lower edge, and the format's name under it.
--
-- The Spices & Agro page's shape (066) - a photo and a name per row - plus the
-- icon.
--
-- The copy lives in page_section_copy under ('qsr-franchise', 'coverage').
-- Both keys are already allowed, so no check widens here.

CREATE TABLE qsr_franchise_coverage_categories (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The photo, from one of two mutually exclusive sources.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The format's name, shown under the photo.
  label             VARCHAR(120)  NOT NULL,
  -- A name from the icon allowlist, drawn in the badge on the photo's edge.
  icon              VARCHAR(60)   NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT qsr_franchise_coverage_categories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT qsr_franchise_coverage_categories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT qsr_franchise_coverage_categories_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A card is its photo; one without is an empty frame.
  CONSTRAINT qsr_franchise_coverage_categories_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT qsr_franchise_coverage_categories_label_check
    CHECK (btrim(label) <> ''),
  CONSTRAINT qsr_franchise_coverage_categories_icon_check
    CHECK (btrim(icon) <> '')
);

CREATE INDEX idx_qsr_franchise_coverage_categories_order
  ON qsr_franchise_coverage_categories (display_order, created_at);
CREATE INDEX idx_qsr_franchise_coverage_categories_status
  ON qsr_franchise_coverage_categories (status);
CREATE INDEX idx_qsr_franchise_coverage_categories_image_file
  ON qsr_franchise_coverage_categories (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER qsr_franchise_coverage_categories_set_updated_at
  BEFORE UPDATE ON qsr_franchise_coverage_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
