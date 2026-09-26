-- About page CMS: the People section - its copy, and the people in it.
--
-- Two tables for one tab, because they are two different kinds of thing:
--
--   about_team_section  the eyebrow, headline and description above the grid.
--                       One of them, so a singleton pinned to id = 1.
--   about_team_members  the cards under it. A person is created, edited,
--                       published, reordered and deleted, so they are rows -
--                       the same shape as career_vacancies.
--
-- The four operating principles BELOW the grid are not here and get no table.
-- They are four illustrated tiles whose artwork, accent colour and numbering
-- are part of the page's design rather than its copy, and the user asked for
-- the team to become editable, not them.

CREATE TABLE about_team_section (
  id             SMALLINT      PRIMARY KEY DEFAULT 1,

  -- The small label above the headline ('People & principles').
  eyebrow        VARCHAR(120)  NOT NULL,

  -- Home page heading markup (utils/heading-markup): a newline is a line
  -- break, **like this** is the orange gradient accent. The page's own copy is
  -- one line with the closing phrase accented, so it is stored that way.
  heading        TEXT          NOT NULL,

  subtext        TEXT          NOT NULL,

  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT about_team_section_singleton_check
    CHECK (id = 1),

  CONSTRAINT about_team_section_copy_not_blank_check
    CHECK (btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(subtext) <> '')
);

CREATE TRIGGER about_team_section_set_updated_at
  BEFORE UPDATE ON about_team_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── the people ────────────────────────────────────────────────────────────

CREATE TABLE about_team_members (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  name           VARCHAR(120)  NOT NULL,

  -- The line under the name ('Chief Technology Officer').
  role           VARCHAR(160)  NOT NULL,

  /*
   * The grey line under the role. The page composes it today from two fields
   * of its hardcoded array - a place and a set of focus words, joined with
   * ' · ' ('Nashik / Bangalore · Delivery · Quality · DevEx').
   *
   * Stored as the one line it renders as, not as the two fields it was built
   * from: the card prints it verbatim and nothing filters or groups on either
   * half, so splitting it would buy two inputs, a separator to agree on, and
   * no capability. career_vacancies.location/work_mode went the other way for
   * exactly the reason that does not apply here - those two ARE filtered on
   * and rendered as separate chips.
   */
  meta           VARCHAR(160)  NOT NULL,

  /*
   * An optional headshot, square. Two sources, at most one set at a time - see
   * about_founder_note.photo_url for the pair's reasoning.
   *
   * Both NULL as seeded: the card then renders the initials monogram in a tint
   * of the accent colour the component derives from the person's position, as
   * it does today. There are no initials and no accent columns - both are the
   * site's own derivation, and a stored copy that could disagree with the name
   * is worse than none.
   */
  photo_url      VARCHAR(1000),
  photo_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  -- Who reads first is an editorial decision, not an alphabetical one.
  display_order  INTEGER       NOT NULL DEFAULT 0,

  created_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT about_team_members_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT about_team_members_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT about_team_members_single_photo_source_check
    CHECK (photo_url IS NULL OR photo_file_id IS NULL),

  CONSTRAINT about_team_members_copy_not_blank_check
    CHECK (btrim(name) <> '' AND btrim(role) <> '' AND btrim(meta) <> '')
);

-- The public read path: ACTIVE rows in display order. created_at is the
-- tie-break, matching ORDER BY display_order ASC, created_at ASC in the
-- repository - without it two people sharing a position swap places between
-- reads.
CREATE INDEX about_team_members_published_idx
  ON about_team_members (display_order, created_at)
  WHERE status = 'ACTIVE';

-- The admin list reads every row in the same order.
CREATE INDEX about_team_members_order_idx
  ON about_team_members (display_order ASC, created_at ASC);

-- Lets the files module answer "is this asset still referenced?" before a purge.
CREATE INDEX about_team_members_photo_file_idx
  ON about_team_members (photo_file_id)
  WHERE photo_file_id IS NOT NULL;

CREATE TRIGGER about_team_members_set_updated_at
  BEFORE UPDATE ON about_team_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
