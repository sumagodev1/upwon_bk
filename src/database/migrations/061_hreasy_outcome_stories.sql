-- HREasy product page CMS: "95% Fewer HR Errors. 40% Less Admin Time. One
-- System, Three Business Verticals."
--
-- A row of case-study cards, each led by a dark stat panel. Two tables, the
-- same pair the FMS page carries:
--
--   hreasy_outcome_stories  one per customer - its headline figure, brand,
--                           badge, story and link
--   hreasy_outcome_stats    the small figures under the rule, cascading
--
-- Shaped differently from the FMS and POS cards, which lead on a photograph
-- and a quote. This card has neither: the panel is a headline figure over a
-- row of smaller ones, and the prose underneath is the site's own summary
-- rather than something a customer said. So there is no photo, no quote and
-- no attribution here - fields the card would never draw.
--
-- The brand mark is optional, unlike the FMS card's: Luft Food is set as
-- words today and Monginis as a wordmark, and the card renders the name when
-- there is no image. That is a working design rather than a hole, so it is
-- not required.
--
-- The eyebrow, heading and subtext above the row live once in
-- page_section_copy under ('hreasy', 'outcomes'). That section key is already
-- allowed - the ERP, SFA-DMS, FMS and POS pages use it - so no check widens
-- here.

CREATE TABLE hreasy_outcome_stories (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The customer's name. Drawn as words when there is no mark, and used as
  -- the alt text on the mark when there is one.
  name              VARCHAR(160)  NOT NULL,
  -- Stable across renames, so a deep link keeps pointing at the same story.
  slug              VARCHAR(80)   NOT NULL UNIQUE,

  /*
   * The brand mark, from one of two mutually exclusive sources. Optional: a
   * story without one draws its name instead, which is what the flagship
   * card does today.
   */
  logo_url          VARCHAR(1000),
  logo_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The small orange badge beside the brand: "Flagship Story".
  tag               VARCHAR(60)   NOT NULL,

  /*
   * The headline figure in the dark panel and the line under it: "95%" over
   * "fewer HR errors".
   *
   * Text rather than a number, as on the FMS card: the card renders it
   * verbatim, and the percent sign, the plus and the "yrs" carry as much
   * meaning as the digits.
   */
  hero_value        VARCHAR(40)   NOT NULL,
  hero_label        VARCHAR(160)  NOT NULL,

  -- The paragraph under the brand row.
  body              TEXT          NOT NULL,

  -- The link out of the card: "Read story".
  link_label        VARCHAR(120)  NOT NULL,
  link_href         VARCHAR(500)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hreasy_outcome_stories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT hreasy_outcome_stories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT hreasy_outcome_stories_single_logo_source_check
    CHECK (logo_url IS NULL OR logo_file_id IS NULL),
  CONSTRAINT hreasy_outcome_stories_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT hreasy_outcome_stories_not_blank_check
    CHECK (
      btrim(name) <> '' AND btrim(tag) <> ''
      AND btrim(hero_value) <> '' AND btrim(hero_label) <> ''
      AND btrim(body) <> ''
      AND btrim(link_label) <> '' AND btrim(link_href) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX hreasy_outcome_stories_published_idx
  ON hreasy_outcome_stories (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX hreasy_outcome_stories_logo_file_idx
  ON hreasy_outcome_stories (logo_file_id)
  WHERE logo_file_id IS NOT NULL;

CREATE TRIGGER hreasy_outcome_stories_set_updated_at
  BEFORE UPDATE ON hreasy_outcome_stories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── the small figures under the rule ──────────────────────────────────────

CREATE TABLE hreasy_outcome_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CASCADE: a figure has no meaning apart from the story it belongs to.
  story_id          UUID          NOT NULL
                                  REFERENCES hreasy_outcome_stories(id) ON DELETE CASCADE,

  /*
   * The figure as it is read: "250+", "7 yrs", "40%". Text rather than a
   * number, for the same reason the headline figure is.
   */
  value             VARCHAR(40)   NOT NULL,
  -- The small caps line under it, which says what the figure counts.
  label             VARCHAR(160)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hreasy_outcome_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT hreasy_outcome_stats_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT hreasy_outcome_stats_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '')
);

-- Covers both the admin list (one story's figures, in order) and the public
-- read (the active ones), which are the only two queries.
CREATE INDEX hreasy_outcome_stats_by_story_idx
  ON hreasy_outcome_stats (story_id, display_order, created_at);

CREATE TRIGGER hreasy_outcome_stats_set_updated_at
  BEFORE UPDATE ON hreasy_outcome_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
