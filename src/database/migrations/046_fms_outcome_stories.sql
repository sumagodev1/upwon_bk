-- FMS product page CMS: "35 Outlets Became 200. The Back-Office Team Didn't
-- Grow at All."
--
-- A case-study carousel: a full-bleed photograph with a card floating over it,
-- cycling between the networks running on UpWon. Two tables:
--
--   fms_outcome_stories  one per network - its photo, logo, quote and person
--   fms_outcome_stats    the three figures on its card, cascading from it
--
-- Every visible thing belongs to a story, including the background photograph:
-- the picture changes with the card, so it is a column on the story rather
-- than one image for the section.
--
-- Shaped differently from the SFA-DMS outcome cards, which are a row of small
-- tiles with one portrait each. This is one large composition at a time, so a
-- story carries a wide photograph, a brand mark, and a figure list of its own.
--
-- The eyebrow, heading and subtext above the carousel live once in
-- page_section_copy under ('fms', 'outcomes'). That section key is already
-- allowed - the ERP and SFA-DMS pages use it - so no check widens here.

CREATE TABLE fms_outcome_stories (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The network's name. Also the alt text on its mark, and what the avatar
  -- beside the quote draws its initials from.
  name              VARCHAR(160)  NOT NULL,
  -- Stable across renames, so a deep link keeps pointing at the same story.
  slug              VARCHAR(80)   NOT NULL UNIQUE,

  -- The brand mark on the card, from one of two mutually exclusive sources.
  logo_url          VARCHAR(1000),
  logo_file_id      UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- The photograph behind the card, same two sources.
  photo_url         VARCHAR(1000),
  photo_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  -- What the network said.
  quote             TEXT          NOT NULL,
  -- Who said it, and where they work. Two fields because the card draws them
  -- on two lines, in different weights.
  person_name       VARCHAR(160)  NOT NULL,
  person_company    VARCHAR(160)  NOT NULL,

  -- The link out of the card: "Watch the case study".
  link_label        VARCHAR(120)  NOT NULL,
  link_href         VARCHAR(500)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_outcome_stories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_outcome_stories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_outcome_stories_single_logo_source_check
    CHECK (logo_url IS NULL OR logo_file_id IS NULL),
  CONSTRAINT fms_outcome_stories_single_photo_source_check
    CHECK (photo_url IS NULL OR photo_file_id IS NULL),
  /*
   * Both are the composition: the card floats over the photograph, so a story
   * without one is a card over a black rectangle, and a story without a mark
   * is a card that never says whose outcome it is.
   */
  CONSTRAINT fms_outcome_stories_logo_required_check
    CHECK (logo_url IS NOT NULL OR logo_file_id IS NOT NULL),
  CONSTRAINT fms_outcome_stories_photo_required_check
    CHECK (photo_url IS NOT NULL OR photo_file_id IS NOT NULL),
  CONSTRAINT fms_outcome_stories_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT fms_outcome_stories_not_blank_check
    CHECK (
      btrim(name) <> '' AND btrim(quote) <> ''
      AND btrim(person_name) <> '' AND btrim(person_company) <> ''
      AND btrim(link_label) <> '' AND btrim(link_href) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX fms_outcome_stories_published_idx
  ON fms_outcome_stories (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a
-- purge. Two indexes rather than one on both columns: they are read one at a
-- time.
CREATE INDEX fms_outcome_stories_logo_file_idx
  ON fms_outcome_stories (logo_file_id)
  WHERE logo_file_id IS NOT NULL;

CREATE INDEX fms_outcome_stories_photo_file_idx
  ON fms_outcome_stories (photo_file_id)
  WHERE photo_file_id IS NOT NULL;

CREATE TRIGGER fms_outcome_stories_set_updated_at
  BEFORE UPDATE ON fms_outcome_stories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -- the figures on the card -------------------------------------------------

CREATE TABLE fms_outcome_stats (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CASCADE: a figure has no meaning apart from the story it belongs to.
  story_id          UUID          NOT NULL
                                  REFERENCES fms_outcome_stories(id) ON DELETE CASCADE,

  /*
   * The figure as it is read: "250+", "6,000+", "35 to 200+", "Rs 23L". Text
   * rather than a number, because the card renders it verbatim and the arrow,
   * the suffix and the currency carry as much meaning as the digits.
   */
  value             VARCHAR(40)   NOT NULL,
  -- The line under it, which says what the figure counts.
  label             VARCHAR(160)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fms_outcome_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT fms_outcome_stats_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT fms_outcome_stats_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '')
);

-- Covers both the admin list (one story's figures, in order) and the public
-- read (the active ones), which are the only two queries.
CREATE INDEX fms_outcome_stats_by_story_idx
  ON fms_outcome_stats (story_id, display_order, created_at);

CREATE TRIGGER fms_outcome_stats_set_updated_at
  BEFORE UPDATE ON fms_outcome_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
