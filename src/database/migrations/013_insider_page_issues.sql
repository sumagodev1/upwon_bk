-- Insider page CMS: issues and their stories.
--
-- The Insider is a monthly digest. An issue is the month ('March 2026', issue
-- 4) and owns an ordered set of stories; the site renders the issue as a card
-- grid at /newsletter/<issue-slug> and each story as an article at
-- /newsletter/<issue-slug>/<story-slug>. Slugs are therefore URL segments and
-- carry the same format rule as organizations.slug.

CREATE TABLE insider_issues (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  slug          VARCHAR(100)  NOT NULL,
  label         VARCHAR(120)  NOT NULL,

  -- The running number printed next to the label ('ISSUE 4'). Unique because
  -- two issue 4s is an authoring mistake, never an intent.
  issue_number  INTEGER       NOT NULL,

  -- The one-line pitch under the issue's story grid. NULL lets the site fall
  -- back to its own generic line.

  -- The issue /newsletter opens on. At most one row - see the partial unique
  -- index below. Zero is allowed: the public read then falls back to the
  -- highest-numbered ACTIVE issue, so the page always has something to show.
  is_current    BOOLEAN       NOT NULL DEFAULT false,

  status        VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by    UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by    UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT insider_issues_slug_key UNIQUE (slug),
  CONSTRAINT insider_issues_issue_number_key UNIQUE (issue_number),

  CONSTRAINT insider_issues_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  CONSTRAINT insider_issues_issue_number_check
    CHECK (issue_number > 0),

  CONSTRAINT insider_issues_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT insider_issues_label_not_blank_check
    CHECK (btrim(label) <> '')
);

-- "At most one current issue" as a storage rule rather than an application
-- one. Every row in this index has is_current = true, so uniqueness on it
-- admits exactly one.
CREATE UNIQUE INDEX insider_issues_single_current_idx
  ON insider_issues (is_current)
  WHERE is_current;

CREATE TRIGGER insider_issues_set_updated_at
  BEFORE UPDATE ON insider_issues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE insider_stories (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A story has no life outside its issue: deleting the issue deletes it.
  issue_id       UUID          NOT NULL REFERENCES insider_issues(id) ON DELETE CASCADE,

  slug           VARCHAR(100)  NOT NULL,

  -- The small orange label on the card ('Customer win').
  eyebrow        VARCHAR(120)  NOT NULL,
  -- The card's link text ('Get inspired').
  cta_label      VARCHAR(80)   NOT NULL,

  title          VARCHAR(300)  NOT NULL,
  blurb          TEXT          NOT NULL,

  -- Same two-source image rule as the hero tables.
  image_url      VARCHAR(1000),
  image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,
  image_alt      VARCHAR(255),

  -- Free text ('4 min read') rather than minutes: it is copy, and authors
  -- write it the way they want it to read.
  read_time      VARCHAR(40),

  -- The article, one array element per paragraph, stored as plain strings.
  -- JSONB rather than TEXT[] so the read path hands it to the API unchanged,
  -- and rather than one TEXT blob so paragraph boundaries are never guessed.
  body           JSONB         NOT NULL DEFAULT '[]'::jsonb,

  display_order  INTEGER       NOT NULL DEFAULT 0,
  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Unique per issue, not globally: /newsletter/<issue>/<story> scopes it.
  CONSTRAINT insider_stories_issue_slug_key UNIQUE (issue_id, slug),

  CONSTRAINT insider_stories_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  CONSTRAINT insider_stories_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT insider_stories_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT insider_stories_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  CONSTRAINT insider_stories_body_is_array_check
    CHECK (jsonb_typeof(body) = 'array'),

  CONSTRAINT insider_stories_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(cta_label) <> ''
      AND btrim(title) <> '' AND btrim(blurb) <> ''
    )
);

-- An issue's stories in order: both the admin list and the public read.
CREATE INDEX insider_stories_issue_order_idx
  ON insider_stories (issue_id, display_order, created_at);

CREATE INDEX insider_stories_image_file_idx
  ON insider_stories (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER insider_stories_set_updated_at
  BEFORE UPDATE ON insider_stories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
