-- Contact page CMS: hero section.
--
-- The band at the top of /contact - an eyebrow-less headline, a line of
-- subtext, and two crops of the same photograph (a wide desktop composition
-- and a portrait one for phones). There is exactly one of it, so this is a
-- singleton table on the insider_feature_section pattern: the primary key is
-- pinned to 1, which makes a second row impossible.
--
-- No status column, unlike the Insider page's list tables. A page whose hero
-- can be switched off opens with the enquiry form and no explanation of what
-- it is for, so "hide the hero" is not an option worth offering. A missing row
-- means "never authored", and the site keeps its own static copy for that.

CREATE TABLE contact_hero_section (
  id                    SMALLINT      PRIMARY KEY DEFAULT 1,

  -- Authored text in the home page heading markup (utils/heading-markup):
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  -- The read API returns this raw and as a parsed segment tree.
  heading               TEXT          NOT NULL,

  subtext               TEXT          NOT NULL,

  -- Two image sources, at most one of them set at a time:
  --   image_url      an absolute URL or a site-relative path ('/images/x.webp')
  --   image_file_id  an asset uploaded through the files module
  -- Either may be NULL: the hero then renders on its plain background.
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- Narrow-viewport art, the same pair again. NULL falls back to the desktop
  -- image. See 011_home_page_hero_mobile_image.sql for why it exists.
  mobile_image_url      VARCHAR(1000),
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- No image_alt column, by design: alt text is derived from the heading
  -- server-side rather than typed, so an image is never announced unlabelled
  -- and there is no second field to keep in step with the copy.

  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT contact_hero_section_singleton_check
    CHECK (id = 1),

  CONSTRAINT contact_hero_section_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  CONSTRAINT contact_hero_section_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),

  -- Blank-but-present copy renders as an empty headline, which is worse than a
  -- validation error at write time.
  CONSTRAINT contact_hero_section_copy_not_blank_check
    CHECK (btrim(heading) <> '' AND btrim(subtext) <> '')
);

-- No image_file_id index, unlike the list tables: a one-row table is its own
-- index.

CREATE TRIGGER contact_hero_section_set_updated_at
  BEFORE UPDATE ON contact_hero_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
