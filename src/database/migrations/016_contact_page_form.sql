-- Contact page CMS: the copy and the choices around the enquiry form.
--
-- The form's own inputs, its submit button and the buttons on the success
-- screen are behaviour and stay in the website's code. What is authored here
-- is everything a visitor reads around them:
--
--   eyebrow / heading   the two lines above the first input
--   the three lists     the chips and button grids the visitor picks from
--   footnote            the reassurance line beside the submit button
--   success_*           the screen shown after a successful submit
--
-- A singleton, pinned to id = 1, like every other Contact page section. No
-- status column: the form is the reason the page exists, so there is nothing
-- sensible to fall back to if it were switched off.

CREATE TABLE contact_form_section (
  id               SMALLINT      PRIMARY KEY DEFAULT 1,

  eyebrow          VARCHAR(80)   NOT NULL,

  -- The home page heading markup again, so this heading is authored exactly
  -- like the hero's even though the current copy uses no accent.
  heading          TEXT          NOT NULL,

  -- The three choice lists, in the order they are offered, as plain strings.
  -- Stored as jsonb arrays rather than as rows in child tables: they are
  -- ordered lists of labels with no identity of their own, and a visitor's
  -- answer is the label itself.
  business_types   JSONB         NOT NULL DEFAULT '[]'::jsonb,
  revenue_ranges   JSONB         NOT NULL DEFAULT '[]'::jsonb,
  platforms        JSONB         NOT NULL DEFAULT '[]'::jsonb,

  footnote         TEXT          NOT NULL,

  success_heading  TEXT          NOT NULL,
  success_body     TEXT          NOT NULL,

  updated_by       UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT contact_form_section_singleton_check
    CHECK (id = 1),

  CONSTRAINT contact_form_section_business_types_is_array_check
    CHECK (jsonb_typeof(business_types) = 'array'),

  CONSTRAINT contact_form_section_revenue_ranges_is_array_check
    CHECK (jsonb_typeof(revenue_ranges) = 'array'),

  CONSTRAINT contact_form_section_platforms_is_array_check
    CHECK (jsonb_typeof(platforms) = 'array'),

  CONSTRAINT contact_form_section_copy_not_blank_check
    CHECK (
      btrim(eyebrow) <> '' AND btrim(heading) <> '' AND btrim(footnote) <> ''
      AND btrim(success_heading) <> '' AND btrim(success_body) <> ''
    )
);

CREATE TRIGGER contact_form_section_set_updated_at
  BEFORE UPDATE ON contact_form_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
