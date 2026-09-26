-- Blog CMS: the /blog hero becomes a slide carousel.
--
-- 049 stored the hero as a singleton - one slide's copy and two button labels.
-- The page renders the site's shared HeroSlider, the same component as the
-- Insider hero, so it is now authored the same way: rows rotated in
-- display_order, each with its own desktop and phone background. The table is
-- insider_hero_slides (012) with these differences:
--
--   an eyebrow column, required, like home_hero_slides: the blog's pill is
--     authored copy ('THE UPWON BLOG'), not derived from the URL.
--   no image_alt column. HeroSlider draws the backdrop as decoration
--     (alt=""), so there is no text to author.
--   no mobile_image_url column. Pictures are uploads; no slide has ever had a
--     phone crop to carry over, so the phone image is a file id only.
--   image_url is legacy / seed-only, as on blog_posts (049): it holds the
--     seeded slide's site artwork ('/images/hero%20bg.webp'), for which no
--     uploaded file exists, and the admin API never writes a URL into it. The
--     slide's first upload, or removing its picture, clears it.
--
-- No button labels: the site fixes both buttons in its code (BlogPage.jsx:
-- 'Request a Demo' -> /demo, 'Browse the Knowledgebase' -> /knowledgebase).
--
-- The singleton's copy is not carried across in SQL: the seed (blog.data.ts)
-- inserts the page's slide into the empty table, exactly as it seeded the
-- singleton, so the panel still starts from what the site shows.

DROP TABLE blog_hero_section;

CREATE TABLE blog_hero_slides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The small caps pill above the headline.
  eyebrow               VARCHAR(120)  NOT NULL,
  -- Plain text. HeroSlider sets the weight itself by splitting on an em-dash,
  -- so there is no accent markup to store.
  heading               TEXT          NOT NULL,
  subtext               TEXT          NOT NULL,

  -- The desktop background: an upload (image_file_id), or the legacy seeded
  -- site path (image_url - see above). At most one of them; neither means the
  -- site draws the slide on its built-in backdrop.
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- Narrow-viewport art, an upload only. NULL falls back to the desktop image.
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- Ascending. Not UNIQUE, for the same reason as home_hero_slides: a reorder
  -- rewrites the whole set in one statement.
  display_order         INTEGER       NOT NULL DEFAULT 0,

  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT blog_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT blog_hero_slides_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT blog_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  -- Blank-but-present copy renders as an empty headline, which is worse than a
  -- validation error at write time.
  CONSTRAINT blog_hero_slides_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX blog_hero_slides_published_idx
  ON blog_hero_slides (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Let the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX blog_hero_slides_image_file_idx
  ON blog_hero_slides (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE INDEX blog_hero_slides_mobile_image_file_idx
  ON blog_hero_slides (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

CREATE TRIGGER blog_hero_slides_set_updated_at
  BEFORE UPDATE ON blog_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
