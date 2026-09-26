-- Partner Program page CMS: the page hero.
--
-- The band at the top of /partners - the eyebrow pill, the two-line headline
-- whose second line is accented orange, the description paragraph, and (new
-- with this migration) a full-bleed photo backdrop behind all three. There is
-- exactly one of it, so this is a singleton table on the
-- insider_feature_section / contact_hero_section pattern: the primary key is
-- pinned to 1, which makes a second row impossible.
--
-- It is the ONLY authored part of that page. The three partnership models, the
-- earnings block, the FAQ and the closing copy are static artwork in the
-- website's own code and have no section here - which is why this migration
-- adds a hero table rather than a "partner page" table with a column per band.
--
-- No status column, for the same reason contact_hero_section has none: a page
-- whose hero can be switched off opens on its first content block with nothing
-- to say what the page is, so "hide the hero" is not an option worth offering.
-- A missing row means "never authored", and the site keeps its own built-in
-- copy for that.

CREATE TABLE partner_program_hero (
  id              SMALLINT      PRIMARY KEY DEFAULT 1,

  -- The pill above the headline ('UpWon Channel Partner Program'). Sized like
  -- home_hero_slides.eyebrow, which renders through the same component.
  eyebrow         VARCHAR(120)  NOT NULL,

  -- Authored text in the home page heading markup (utils/heading-markup):
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  -- The page's own copy is two lines with the whole second line accented, so
  -- the markup carries it exactly. The read API returns this raw and as a
  -- parsed segment tree.
  heading         TEXT          NOT NULL,

  subtext         TEXT          NOT NULL,

  -- Two image sources, at most one of them set at a time:
  --   image_url      an absolute URL or a site-relative path ('/images/x.webp')
  --   image_file_id  an asset uploaded through the files module
  -- Either may be NULL, and both are NULL as seeded: the hero then renders on
  -- the plain ambient background it has today, which is the point - publishing
  -- this section must not change the page until somebody uploads a photo.
  image_url       VARCHAR(1000),
  image_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- One image, not the desktop/mobile pair the home and Contact heroes carry.
  -- PageHero renders bgImages at 100vw under a navy scrim at every width - one
  -- element, one src, no <picture> and no breakpoint - so a second crop would
  -- be a column the site has nowhere to read from.
  --
  -- No image_alt column either, by design: the backdrop is decorative
  -- (PageHero marks it aria-hidden), and where alt text is needed it is
  -- derived from the heading server-side rather than typed, so there is no
  -- second field to keep in step with the copy.

  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT partner_program_hero_singleton_check
    CHECK (id = 1),

  CONSTRAINT partner_program_hero_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  -- Blank-but-present copy renders as an empty headline, which is worse than a
  -- validation error at write time.
  CONSTRAINT partner_program_hero_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

-- No image_file_id index, unlike the list tables: a one-row table is its own
-- index.

CREATE TRIGGER partner_program_hero_set_updated_at
  BEFORE UPDATE ON partner_program_hero
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
