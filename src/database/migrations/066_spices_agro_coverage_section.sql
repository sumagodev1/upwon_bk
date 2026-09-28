-- Spices & Agro Processing industry page CMS: the industry coverage section.
--
-- "Built for a Wide Range of Spices & Agro Processing Businesses." A heading
-- over a grid of round photo tiles, one per business category, each with its
-- name under it.
--
-- Not the Engineering (052) or Beverages (059) shape - no icons or colours, a
-- photo instead. The same shape as the page's trust logos (063): an image and
-- a name that doubles as its alt text.
--
-- The copy lives in page_section_copy under ('spices-agro', 'coverage'). Both
-- keys are already allowed, so no check widens here.

CREATE TABLE spices_agro_coverage_categories (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The photo, from one of two mutually exclusive sources.
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The category's name, shown under the photo and read in place of it.
  label             VARCHAR(120)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT spices_agro_coverage_categories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT spices_agro_coverage_categories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT spices_agro_coverage_categories_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),
  -- A tile is its photo; one without is an empty circle.
  CONSTRAINT spices_agro_coverage_categories_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT spices_agro_coverage_categories_label_check
    CHECK (btrim(label) <> '')
);

CREATE INDEX idx_spices_agro_coverage_categories_order
  ON spices_agro_coverage_categories (display_order, created_at);
CREATE INDEX idx_spices_agro_coverage_categories_status
  ON spices_agro_coverage_categories (status);
CREATE INDEX idx_spices_agro_coverage_categories_image_file
  ON spices_agro_coverage_categories (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER spices_agro_coverage_categories_set_updated_at
  BEFORE UPDATE ON spices_agro_coverage_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
