-- Home page hero: a second image, for narrow viewports.
--
-- The hero background is rendered with object-cover, so one wide desktop image
-- on a phone is cropped to its middle sliver - whatever the composition was
-- about is usually the first thing lost. A portrait crop authored for mobile
-- avoids that, and the site picks between the two with a <picture> source, so
-- a phone never downloads the desktop file at all.
--
-- The columns mirror the desktop pair exactly, including the "exactly one, or
-- neither" rule, so both variants behave the same way everywhere.

ALTER TABLE home_hero_slides
  ADD COLUMN mobile_image_url      VARCHAR(1000),
  ADD COLUMN mobile_image_file_id  UUID REFERENCES files(id) ON DELETE SET NULL;

ALTER TABLE home_hero_slides
  ADD CONSTRAINT home_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL);

-- Same purpose as home_hero_slides_image_file_idx: lets the files module answer
-- "is this asset still referenced?" before purging a blob.
CREATE INDEX home_hero_slides_mobile_image_file_idx
  ON home_hero_slides (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

COMMENT ON COLUMN home_hero_slides.mobile_image_url IS
  'Narrow-viewport background. Falls back to the desktop image when NULL.';
COMMENT ON COLUMN home_hero_slides.mobile_image_file_id IS
  'Narrow-viewport background as an uploaded asset. Exclusive with mobile_image_url.';
