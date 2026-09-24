-- Home page CMS: the report-download call to action.
--
-- A singleton, not a list: the page has exactly one of these bands, and there
-- is nothing to order, activate or page through. So one row, enforced by the
-- unique `singleton` column rather than by convention - a second INSERT fails
-- at the database rather than quietly giving the public read two candidates to
-- choose between.
--
-- Its eyebrow, heading and subtext are not here. They live in
-- home_section_copy under the 'cta' key, the same as every other section since
-- 021, so an administrator authors them in one place.

ALTER TABLE home_section_copy
  DROP CONSTRAINT home_section_copy_key_check;

ALTER TABLE home_section_copy
  ADD CONSTRAINT home_section_copy_key_check
    CHECK (section_key IN (
      'trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta'
    ));

CREATE TABLE home_cta_section (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The one-row guard. Always true, and unique, so the table holds at most one.
  singleton               BOOLEAN       NOT NULL DEFAULT TRUE UNIQUE,

  -- The collage behind the band. Two images because the band is laid out twice:
  -- the desktop one is bg-contain on the left half, the mobile one bg-cover
  -- across the top. Both optional - with neither set the site falls back to the
  -- artwork it ships, which is the right answer for a band that still renders.
  desktop_image_url       VARCHAR(1000),
  desktop_image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,
  mobile_image_url        VARCHAR(1000),
  mobile_image_file_id    UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The button's text, and the PDF it hands over.
  button_label            VARCHAR(120)  NOT NULL,

  -- Upload only, unlike the image slots' url/file pairs: the point of the
  -- field is that an administrator attaches the report itself. With none set
  -- the button falls back to linking at the site's resources page, which is
  -- what it does today.
  report_file_id          UUID          REFERENCES files(id) ON DELETE SET NULL,

  updated_by              UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_cta_section_singleton_check
    CHECK (singleton),

  CONSTRAINT home_cta_section_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),

  CONSTRAINT home_cta_section_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),

  CONSTRAINT home_cta_section_button_label_not_blank_check
    CHECK (btrim(button_label) <> '')
);

-- Let the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX home_cta_section_desktop_file_idx
  ON home_cta_section (desktop_image_file_id)
  WHERE desktop_image_file_id IS NOT NULL;

CREATE INDEX home_cta_section_mobile_file_idx
  ON home_cta_section (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

CREATE INDEX home_cta_section_report_file_idx
  ON home_cta_section (report_file_id)
  WHERE report_file_id IS NOT NULL;

CREATE TRIGGER home_cta_section_set_updated_at
  BEFORE UPDATE ON home_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
