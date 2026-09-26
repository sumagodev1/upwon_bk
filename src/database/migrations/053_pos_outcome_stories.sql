-- POS product page CMS: "Software replaced. Results delivered."
--
-- The testimonial marquee: wide cards that scroll continuously, each a
-- photograph on the left with the brand mark, the quote, the attribution and a
-- link out on the right.
--
-- The same shape as the FMS page's outcome stories, minus that page's stat
-- chips - this card carries no numbers, so there is no second table here.
--
-- Its own table rather than a page column on fms_outcome_stories: the two
-- pages quote different customers about different things, and re-cutting one
-- page's set should not move the other.
--
-- The eyebrow, heading and subtext above the row live once in
-- page_section_copy under ('pos', 'outcomes'). That key is already allowed -
-- the ERP, SFA-DMS and FMS pages use it - so no check widens here.

CREATE TABLE pos_outcome_stories (
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

  CONSTRAINT pos_outcome_stories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pos_outcome_stories_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT pos_outcome_stories_single_logo_source_check
    CHECK (logo_url IS NULL OR logo_file_id IS NULL),
  CONSTRAINT pos_outcome_stories_single_photo_source_check
    CHECK (photo_url IS NULL OR photo_file_id IS NULL),
  /*
   * Both are the composition: the card floats over the photograph, so a story
   * without one is a card over a black rectangle, and a story without a mark
   * is a card that never says whose outcome it is.
   */
  CONSTRAINT pos_outcome_stories_logo_required_check
    CHECK (logo_url IS NOT NULL OR logo_file_id IS NOT NULL),
  CONSTRAINT pos_outcome_stories_photo_required_check
    CHECK (photo_url IS NOT NULL OR photo_file_id IS NOT NULL),
  CONSTRAINT pos_outcome_stories_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT pos_outcome_stories_not_blank_check
    CHECK (
      btrim(name) <> '' AND btrim(quote) <> ''
      AND btrim(person_name) <> '' AND btrim(person_company) <> ''
      AND btrim(link_label) <> '' AND btrim(link_href) <> ''
    )
);

-- The public read path: ACTIVE rows in display order. Covers the whole query.
CREATE INDEX pos_outcome_stories_published_idx
  ON pos_outcome_stories (display_order, created_at)
  WHERE status = 'ACTIVE';

-- Lets the files module answer "is this asset still referenced?" before a
-- purge. Two indexes rather than one on both columns: they are read one at a
-- time.
CREATE INDEX pos_outcome_stories_logo_file_idx
  ON pos_outcome_stories (logo_file_id)
  WHERE logo_file_id IS NOT NULL;

CREATE INDEX pos_outcome_stories_photo_file_idx
  ON pos_outcome_stories (photo_file_id)
  WHERE photo_file_id IS NOT NULL;

CREATE TRIGGER pos_outcome_stories_set_updated_at
  BEFORE UPDATE ON pos_outcome_stories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
