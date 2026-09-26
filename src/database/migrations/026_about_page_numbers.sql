-- About page CMS: the Number section - its copy, and the stat cards in it.
--
-- Two tables for one tab, on the same split as 025: the eyebrow, headline and
-- description are a singleton, and the four cards under them are rows that are
-- created, edited, published, reordered and deleted.
--
-- The client-logo strip BELOW the cards is not here and gets no table. It is
-- the site's shared <TrustStrip>, rendered on the home page too, and the user
-- asked for the numbers to become editable, not the brand wall.

CREATE TABLE about_numbers_section (
  id             SMALLINT      PRIMARY KEY DEFAULT 1,

  -- The small label above the headline ('UpWon in numbers').
  eyebrow        VARCHAR(120)  NOT NULL,

  -- Home page heading markup (utils/heading-markup): a newline is a line
  -- break, **like this** is the orange gradient accent. The page's own copy is
  -- one line with the closing phrase accented.
  heading        TEXT          NOT NULL,

  subtext        TEXT          NOT NULL,

  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT about_numbers_section_singleton_check
    CHECK (id = 1),

  CONSTRAINT about_numbers_section_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

CREATE TRIGGER about_numbers_section_set_updated_at
  BEFORE UPDATE ON about_numbers_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── the stat cards ────────────────────────────────────────────────────────

CREATE TABLE about_number_stats (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * The big number, exactly as it is printed: '150+', '7', '12+', '98%'.
   *
   * TEXT, not an integer plus a suffix column. The card animates a count-up to
   * the digits and prints whatever follows them in orange, so the site already
   * has to separate the two - and it can do that from one string without an
   * admin being asked to type '150' in one box and '+' in another, or being
   * refused the day the answer is '₹16 Cr'. What cannot be derived from two
   * columns is the order they go in; what can be derived from this one is
   * everything the card needs.
   */
  value          VARCHAR(20)   NOT NULL,

  -- The bold line under the number ('Businesses Deployed').
  label          VARCHAR(120)  NOT NULL,

  -- The grey line under that ('Across food, FMCG and franchise verticals').
  description    VARCHAR(200)  NOT NULL,

  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  display_order  INTEGER       NOT NULL DEFAULT 0,

  created_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- No icon column. The component picks the icon per card position from a
  -- fixed set of lucide components, and a lucide name in a text column would
  -- be a string the admin can mistype into a card with no icon at all. It
  -- stays derived, in the website's code, like the accent colours on the team
  -- cards.

  CONSTRAINT about_number_stats_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT about_number_stats_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT about_number_stats_copy_not_blank_check
    CHECK (btrim(value) <> '' AND btrim(label) <> '' AND btrim(description) <> '')
);

-- The public read path: ACTIVE rows in display order, with created_at as the
-- tie-break - see about_team_members_published_idx.
CREATE INDEX about_number_stats_published_idx
  ON about_number_stats (display_order, created_at)
  WHERE status = 'ACTIVE';

CREATE INDEX about_number_stats_order_idx
  ON about_number_stats (display_order ASC, created_at ASC);

CREATE TRIGGER about_number_stats_set_updated_at
  BEFORE UPDATE ON about_number_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
