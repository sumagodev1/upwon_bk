-- Clients page CMS: hero section.
--
-- The Clients & Case Studies page (/clients) opens with the site's shared
-- HeroSlider, which rotates through every ACTIVE row in display_order. Same
-- content model as insider_hero_slides, including the desktop/mobile image
-- pairs, and for the same reasons:
--
--   no eyebrow column. The pill always reads 'CLIENTS & CASE STUDIES' - it
--     names the page, not the slide - so it stays in the website's code, as
--     do the two CTAs ('Request a Demo', 'Explore What UpWon Does').
--   no shine column. HeroSlider has no shine treatment.
--
-- The heading is plain text. HeroSlider sets the weight itself by splitting on
-- an em-dash, so there is no accent markup to store.
CREATE TABLE clients_hero_slides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  heading               TEXT          NOT NULL,
  subtext               TEXT          NOT NULL,

  -- Two image sources, at most one of them set at a time:
  --   image_url      an absolute URL or a site-relative path ('/images/x.webp')
  --   image_file_id  an asset uploaded through the files module
  -- Either may be NULL: the slide then renders on the section's static
  -- background.
  image_url             VARCHAR(1000),
  image_file_id         UUID          REFERENCES files(id) ON DELETE SET NULL,
  image_alt             VARCHAR(255),

  -- Narrow-viewport art, the same pair again. NULL falls back to the desktop
  -- image. See 011_home_page_hero_mobile_image.sql for why it exists.
  mobile_image_url      VARCHAR(1000),
  mobile_image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- Ascending. Not UNIQUE, for the same reason as insider_hero_slides: a reorder
  -- rewrites the whole set in one statement.
  display_order         INTEGER       NOT NULL DEFAULT 0,

  status                VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by            UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT clients_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT clients_hero_slides_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT clients_hero_slides_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  CONSTRAINT clients_hero_slides_single_mobile_image_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),

  -- Blank-but-present copy renders as an empty headline, which is worse than a
  -- validation error at write time.
  CONSTRAINT clients_hero_slides_copy_not_blank_check
    CHECK (btrim(heading) <> '' AND btrim(subtext) <> '')
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX clients_hero_slides_published_idx
  ON clients_hero_slides (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Let the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX clients_hero_slides_image_file_idx
  ON clients_hero_slides (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE INDEX clients_hero_slides_mobile_image_file_idx
  ON clients_hero_slides (mobile_image_file_id)
  WHERE mobile_image_file_id IS NOT NULL;

CREATE TRIGGER clients_hero_slides_set_updated_at
  BEFORE UPDATE ON clients_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
