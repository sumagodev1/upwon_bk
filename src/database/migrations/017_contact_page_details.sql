-- Contact page CMS: the two side cards beside the enquiry form.
--
-- "Where we are" (a title and a short ordered list of offices, each a name and
-- a line of detail) and "Direct lines" (a title and the three ways to reach
-- sales). Both cards live in one singleton row because they are one editing
-- job: an admin opening this tab is changing how the company can be reached,
-- and splitting them would mean two saves for one intent.
--
-- These values used to come from the website's src/data/company.js, which the
-- rest of the site still uses for everything else; the contact page simply
-- stops reading it for the lines an admin now owns.

CREATE TABLE contact_details_section (
  id             SMALLINT      PRIMARY KEY DEFAULT 1,

  -- Card one: the heading, then the entries under it.
  offices_title  VARCHAR(80)   NOT NULL,

  -- An ordered array of { "name": string, "detail": string } objects. jsonb
  -- rather than a child table for the same reason as the form's choice lists:
  -- ordered copy with no identity of its own, always written as a whole set.
  offices        JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- Card two: the heading, then the three direct lines.
  direct_title   VARCHAR(80)   NOT NULL,

  email          VARCHAR(254)  NOT NULL,
  phone          VARCHAR(30)   NOT NULL,

  -- Stored as authored (the site strips non-digits before building the wa.me
  -- link), so the admin sees the number in the form it is dialled in.
  whatsapp       VARCHAR(30)   NOT NULL,

  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT contact_details_section_singleton_check
    CHECK (id = 1),

  -- The shape of each entry is enforced by the validator, which can report a
  -- per-row field error; a CHECK can only say the whole column is wrong.
  CONSTRAINT contact_details_section_offices_is_array_check
    CHECK (jsonb_typeof(offices) = 'array'),

  CONSTRAINT contact_details_section_copy_not_blank_check
    CHECK (
      btrim(offices_title) <> '' AND btrim(direct_title) <> ''
      AND btrim(email) <> '' AND btrim(phone) <> '' AND btrim(whatsapp) <> ''
    ),

  -- A last line of defence, not the format check: that is the validator's, and
  -- it reports which part of the address is wrong.
  CONSTRAINT contact_details_section_email_shape_check
    CHECK (position('@' IN email) > 1)
);

CREATE TRIGGER contact_details_section_set_updated_at
  BEFORE UPDATE ON contact_details_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
