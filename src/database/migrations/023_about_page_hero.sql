-- About page CMS: the page hero.
--
-- The band at the top of /about - an eyebrow pill, a headline whose second
-- half is accented orange, a description paragraph, two buttons, and a
-- rotating photo backdrop behind all of it. There is exactly one of it, so
-- this is a singleton table on the partner_program_hero / contact_hero_section
-- pattern: the primary key is pinned to 1, which makes a second row
-- impossible.
--
-- The two buttons are NOT here. They point at /demo and /what-is-upwon, they
-- are the same two on every hero the site ships, and nobody asked for a link
-- editor - so they stay in the website's own code.
--
-- No status column, for the same reason partner_program_hero has none: a page
-- whose hero can be switched off opens on its first content block with nothing
-- to say what the page is. A missing row means "never authored", and the site
-- keeps its own built-in copy for that.

CREATE TABLE about_hero_section (
  id             SMALLINT      PRIMARY KEY DEFAULT 1,

  -- The pill above the headline ('ABOUT UPWON & BYTE ELEPHANTS TECHNOLOGIES').
  -- Sized like partner_program_hero.eyebrow, which renders through the same
  -- kind of hero band.
  eyebrow        VARCHAR(120)  NOT NULL,

  -- Authored text in the home page heading markup (utils/heading-markup):
  --   a newline      -> a line break
  --   **like this**  -> the orange gradient accent
  -- The page's own copy is a setup, an em dash, and a payoff the component
  -- renders in extrabold on the line below, so the markup carries it as two
  -- lines with the second accented. The read API returns this raw and as a
  -- parsed segment tree.
  heading        TEXT          NOT NULL,

  subtext       TEXT          NOT NULL,

  /*
   * THE ROTATING BACKDROP, AS AN ORDERED SET.
   *
   * Unlike every other hero in this CMS, this one is a slider: the website's
   * <HeroSlider> crossfades between backdrops on a timer, and /about ships
   * three of them today. One image column would have published a hero that
   * stopped rotating the moment it was saved, which is a change to the page
   * this feature is not allowed to make - so the slot is a list.
   *
   * An ordered array of { "imageUrl": string|null, "imageFileId": uuid|null }
   * objects, at most one source set per entry, in the order they rotate.
   * jsonb rather than a child table for the reason contact_details_section's
   * offices are jsonb: ordered content with no identity of its own, always
   * written as a whole set, never addressed one row at a time. They carry no
   * status and no order column because position IS the array index and
   * "hide one backdrop" is not a thing anybody asked for.
   *
   * The cost of jsonb here is real and worth naming: an imageFileId inside it
   * is not an FK, so a purged upload leaves a dangling id behind. That is the
   * same outcome the FK's ON DELETE SET NULL produces, because files are
   * soft-deleted and resolveImageSource already renders a missing asset as no
   * image rather than failing the request - so the section degrades identically
   * either way, and the files module's "is this still referenced?" question is
   * answered by a jsonb containment scan on one row instead of an index.
   *
   * Empty as far as the schema is concerned is legal: the hero then renders on
   * the plain navy ground <HeroSlider> falls back to.
   *
   * No image_alt column, by design: the backdrop is decorative (the slider
   * marks it aria-hidden), and where alt text is needed it is derived from the
   * heading server-side rather than typed, so there is no second field to keep
   * in step with the copy.
   */
  backdrops      JSONB         NOT NULL DEFAULT '[]'::jsonb,

  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT about_hero_section_singleton_check
    CHECK (id = 1),

  -- The shape of each entry is enforced by the validator, which can report a
  -- per-row field error ('backdrops[1].imageUrl'); a CHECK can only say the
  -- whole column is wrong.
  CONSTRAINT about_hero_section_backdrops_is_array_check
    CHECK (jsonb_typeof(backdrops) = 'array'),

  -- Blank-but-present copy renders as an empty headline, which is worse than a
  -- validation error at write time.
  CONSTRAINT about_hero_section_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

-- No index of any kind: a one-row table is its own index.

CREATE TRIGGER about_hero_section_set_updated_at
  BEFORE UPDATE ON about_hero_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
