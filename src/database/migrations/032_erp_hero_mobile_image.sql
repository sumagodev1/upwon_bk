-- A separate portrait background for the ERP hero on phones.
--
-- The slide has carried one image since 024, drawn object-cover at every size.
-- A 3:2 photograph cropped into a tall phone viewport keeps its middle and
-- loses both ends, which is where the subject usually is - so this is the same
-- pair the home page hero has had since 011.
--
-- Optional, and optional on purpose: a slide with no mobile image falls back to
-- the desktop one, which is exactly what every slide does today. Nothing
-- changes on the site until somebody uploads one.

ALTER TABLE erp_hero_slides
  ADD COLUMN mobile_image_url      VARCHAR(1000),
  ADD COLUMN mobile_image_file_id  UUID REFERENCES files(id) ON DELETE SET NULL;

-- The same rule as the desktop pair: an image comes from a URL or an upload,
-- never both, so there is one answer to "where does this picture live".
ALTER TABLE erp_hero_slides
  ADD CONSTRAINT erp_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL);

CREATE INDEX erp_hero_slides_mobile_image_file_idx
  ON erp_hero_slides (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

COMMENT ON COLUMN erp_hero_slides.mobile_image_url IS
  'Portrait background shown under 768px. Null falls back to the desktop image.';
COMMENT ON COLUMN erp_hero_slides.mobile_image_file_id IS
  'Uploaded portrait background. Exclusive with mobile_image_url.';
