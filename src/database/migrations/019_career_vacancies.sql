-- Careers page: the vacancies the Open Roles list renders.
--
-- The website's /careers page held these six roles as a hardcoded array, each
-- row a mailto: link. This table replaces the array; 020 adds the inbox that
-- replaces the mailto:.
--
-- Ordinary CMS content, on the same pattern as insider_stories: authored in
-- the panel, read by the marketing site, published with a status rather than
-- deleted, and arranged by display_order because "which role do we want read
-- first" is an editorial decision, not an alphabetical one.

CREATE TABLE career_vacancies (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  title          VARCHAR(200)  NOT NULL,

  -- The small orange label above the title on the Careers page today
  -- ('Engineering', 'Delivery'). Free text rather than a lookup table: the
  -- list changes as the company does, and there is nothing else to hang off a
  -- department row.
  department     VARCHAR(80)   NOT NULL,

  -- Split out of the page's single 'Nashik · On-site' string: the place is
  -- text, the arrangement is a closed list, and only the split version can be
  -- filtered on in the admin or rendered as two chips.
  location       VARCHAR(120)  NOT NULL,
  work_mode      VARCHAR(20)   NOT NULL,

  -- What the role is, shown as prose at the top of the details popup.
  description    TEXT          NOT NULL,

  -- The two bullet lists under it. JSONB arrays of plain strings, exactly like
  -- insider_stories.body: one element per bullet, so the popup never has to
  -- guess where a bullet ended, and the API hands the array over unchanged.
  -- Both may be empty - the popup then omits the heading rather than printing
  -- an empty list.
  requirements   JSONB         NOT NULL DEFAULT '[]'::jsonb,
  skills         JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- Free text ('3-5 years'), not a number of months: it is copy, a recruiter
  -- writes it the way it should read, and ranges and 'Fresher' are both normal
  -- answers that an integer column cannot hold.
  experience     VARCHAR(60)   NOT NULL,

  status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  display_order  INTEGER       NOT NULL DEFAULT 0,

  created_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT career_vacancies_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),

  -- Mirrors WORK_MODES in src/config/constants.ts. TypeScript is the first
  -- line of defence; this is the guarantee.
  CONSTRAINT career_vacancies_work_mode_check
    CHECK (work_mode IN ('On-site', 'Hybrid', 'Remote', 'Field')),

  CONSTRAINT career_vacancies_display_order_check
    CHECK (display_order >= 0),

  CONSTRAINT career_vacancies_requirements_is_array_check
    CHECK (jsonb_typeof(requirements) = 'array'),

  CONSTRAINT career_vacancies_skills_is_array_check
    CHECK (jsonb_typeof(skills) = 'array'),

  CONSTRAINT career_vacancies_copy_not_blank_check
    CHECK (
      btrim(title) <> '' AND btrim(department) <> '' AND btrim(location) <> ''
      AND btrim(description) <> '' AND btrim(experience) <> ''
    )
);

-- The public list reads ACTIVE rows in display order and the admin list reads
-- every row in the same order, so one index covers both. created_at is the
-- tie-break, matching ORDER BY display_order ASC, created_at ASC in the
-- repository - without it two roles sharing a position swap places between
-- reads.
CREATE INDEX career_vacancies_order_idx
  ON career_vacancies (display_order ASC, created_at ASC);

CREATE TRIGGER career_vacancies_set_updated_at
  BEFORE UPDATE ON career_vacancies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
