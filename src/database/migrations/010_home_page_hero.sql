-- Home page CMS: hero section.
--
-- One row per hero slide. The website's HeroSection auto-rotates through every
-- ACTIVE row in display_order, so this table is the whole content model for the
-- hero - there is no separate "section" row, because every field the hero owns
-- (eyebrow, heading, subtext, image) varies per slide.

CREATE TABLE home_hero_slides (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Small pill above the headline, e.g. 'Built for Franchises'.
  eyebrow         VARCHAR(120)  NOT NULL,

  -- Stored as authored text, not HTML, so nothing an admin types can inject
  -- markup into the site. Two markers are honoured when it is rendered:
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  -- The read API returns both this raw string and a parsed segment tree, so the
  -- frontend never has to implement the parser.
  heading         TEXT          NOT NULL,

  subtext         TEXT          NOT NULL,

  -- Two image sources, at most one of them set at a time:
  --   image_url      an absolute URL or a site-relative path ('/images/x.webp')
  --   image_file_id  an asset uploaded through the files module
  -- Either may be NULL: a slide can also render on the section's static
  -- background alone.
  image_url       VARCHAR(1000),
  image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,
  image_alt       VARCHAR(255),

  -- Opts this slide's headline into the animated text shine treatment.
  shine           BOOLEAN       NOT NULL DEFAULT false,

  -- Ascending. Not UNIQUE: reordering rewrites the whole set in one statement,
  -- and a unique constraint would make that pass through conflicting states.
  display_order   INTEGER       NOT NULL DEFAULT 0,

  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT home_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT home_hero_slides_display_order_check
    CHECK (display_order >= 0),

  -- An uploaded asset and an external URL on the same row would leave "which
  -- one wins?" to the reader. Exactly one, or neither.
  CONSTRAINT home_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  -- Blank-but-present copy renders as an empty pill / empty headline, which is
  -- worse than a validation error at write time.
  CONSTRAINT home_hero_slides_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX home_hero_slides_published_idx
  ON home_hero_slides (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX home_hero_slides_image_file_idx
  ON home_hero_slides (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER home_hero_slides_set_updated_at
  BEFORE UPDATE ON home_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
