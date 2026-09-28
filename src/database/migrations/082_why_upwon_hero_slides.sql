-- Why UpWon page: the hero becomes a slider.
--
-- It was the one hero in the CMS that was not. Every other page - the seven
-- product pages, the ten industry pages and the home page - stores its hero
-- as an ordered list of slides, each carrying its own eyebrow, headline,
-- subhead, artwork and buttons. This one stored a single row and took its
-- words from page_section_copy under ('why-upwon', 'hero').
--
-- That difference reached the editor: every other hero is a list they can add
-- to and reorder, and this one was a form with no way to add a second slide.
-- So the shape changes to match.
--
-- Three things happen here, in order, and all inside the one transaction the
-- runner wraps a migration in - so the page is never left without a hero:
--
--   1. the slides table is created
--   2. the existing hero and its section copy are carried into it as slide 1
--   3. the old table and the now-redundant copy row are dropped
--
-- Column naming keeps this page's `primary_`/`secondary_` rather than the
-- `cta_`/`secondary_` the product pages use. The names are already what its
-- service, its public payload and the website's component call them, and
-- renaming them would ripple through all three for no gain: what the editor
-- asked for is the list, not the column names.

-- ── the slides ────────────────────────────────────────────────────────────

CREATE TABLE why_upwon_hero_slides (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  eyebrow                   VARCHAR(120)  NOT NULL,
  -- Authored text, not HTML: a newline is a line break and **like this** is
  -- the orange accent. Parsed server-side into headlineLines.
  headline                  TEXT          NOT NULL,
  subhead                   TEXT          NOT NULL,

  -- The wide artwork, shown from 1024px up. Optional: with neither source the
  -- site keeps the artwork it ships.
  desktop_image_url         VARCHAR(1000),
  desktop_image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,
  -- The portrait crop phones and tablets get, with the copy under it.
  mobile_image_url          VARCHAR(1000),
  mobile_image_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,
  /*
   * Read aloud in place of the artwork, and required - unlike the decorative
   * backgrounds the product heroes carry. This artwork shows the product, so
   * it is the slide's only content for anyone not looking at it.
   */
  image_alt                 VARCHAR(300)  NOT NULL,

  -- The filled button.
  primary_label             VARCHAR(120)  NOT NULL,
  primary_href              VARCHAR(500)  NOT NULL,
  -- The outlined one beside it. Both halves or neither.
  secondary_label           VARCHAR(120),
  secondary_href            VARCHAR(500),

  display_order             INTEGER       NOT NULL DEFAULT 0,
  status                    VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by                UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT why_upwon_hero_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT why_upwon_hero_slides_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT why_upwon_hero_slides_single_desktop_source_check
    CHECK (desktop_image_url IS NULL OR desktop_image_file_id IS NULL),
  CONSTRAINT why_upwon_hero_slides_single_mobile_source_check
    CHECK (mobile_image_url IS NULL OR mobile_image_file_id IS NULL),
  -- A button is both halves or neither: a label with no destination is a dead
  -- link, and a destination with no label is invisible.
  CONSTRAINT why_upwon_hero_slides_secondary_pair_check
    CHECK (num_nonnulls(secondary_label, secondary_href) <> 1),
  CONSTRAINT why_upwon_hero_slides_not_blank_check
    CHECK (
      btrim(eyebrow) <> ''
      AND btrim(headline) <> ''
      AND btrim(subhead) <> ''
      AND btrim(image_alt) <> ''
      AND btrim(primary_label) <> ''
      AND btrim(primary_href) <> ''
    )
);

CREATE INDEX idx_why_upwon_hero_slides_order
  ON why_upwon_hero_slides (display_order, created_at);
CREATE INDEX idx_why_upwon_hero_slides_status
  ON why_upwon_hero_slides (status);

CREATE TRIGGER why_upwon_hero_slides_set_updated_at
  BEFORE UPDATE ON why_upwon_hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── carry the existing hero over ──────────────────────────────────────────
--
-- The artwork and buttons come from the old row; the eyebrow, headline and
-- subhead from the copy row that used to head it. Both are read here rather
-- than hardcoded, so whatever an editor had already saved is what survives.
--
-- COALESCE on the three copy fields covers the case where the copy row was
-- never written: the columns are NOT NULL and non-blank, so a null would
-- abort the migration and leave the page with no hero at all. The fallbacks
-- are the words the site ships.

INSERT INTO why_upwon_hero_slides (
  eyebrow, headline, subhead,
  desktop_image_url, desktop_image_file_id,
  mobile_image_url, mobile_image_file_id,
  image_alt,
  primary_label, primary_href, secondary_label, secondary_href,
  display_order, status, created_by, updated_by
)
SELECT
  COALESCE(NULLIF(btrim(c.eyebrow), ''), 'WHY UPWON'),
  COALESCE(NULLIF(btrim(c.heading), ''), 'Why Growing Manufacturers **Choose UpWon.**'),
  COALESCE(
    NULLIF(btrim(c.subtext), ''),
    'Manufacturing businesses need more than disconnected software and manual processes. UpWon brings your critical workflows, teams, and business data together in one connected platform.'
  ),
  h.desktop_image_url, h.desktop_image_file_id,
  h.mobile_image_url, h.mobile_image_file_id,
  h.image_alt,
  h.primary_label, h.primary_href, h.secondary_label, h.secondary_href,
  0, 'ACTIVE', h.created_by, h.updated_by
FROM why_upwon_hero_section h
LEFT JOIN page_section_copy c
  ON c.page_key = 'why-upwon' AND c.section_key = 'hero';

-- ── drop what it replaced ─────────────────────────────────────────────────
--
-- The copy row goes too: a slide carries its own words now, so leaving it
-- would be a second, unread copy of the heading an editor could change
-- without anything happening. 'hero' also leaves this page's key list in
-- config/constants.ts, which is what stops the section-copy screen offering
-- it again.

DELETE FROM page_section_copy
 WHERE page_key = 'why-upwon' AND section_key = 'hero';

DROP TABLE why_upwon_hero_section;
