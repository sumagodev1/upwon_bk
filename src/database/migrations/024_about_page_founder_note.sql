-- About page CMS: the founder's note.
--
-- The band under the hero: a dark portrait card on the left (the founder's
-- name, the role under it, the 'Founder of Byte Elephants Technologies' line,
-- and an avatar) beside the note on the right (a pull-quote and the paragraph
-- under it). One singleton row, because it is one editing job - nobody changes
-- the name on the card without reading the quote beside it.
--
-- These values used to come from the website's src/data/company.js
-- (COMPANY.founder), which the rest of the site still uses for everything else;
-- the About page simply stops reading it for the lines an admin now owns. The
-- same thing contact_details_section did to COMPANY.contact.
--
-- The eyebrow above the note ("FOUNDER'S NOTE") and the two buttons under it
-- are NOT here: the eyebrow is the section's own label rather than content
-- about the founder, and the buttons point at /demo and /careers. Both stay in
-- the website's code, and nobody asked for either.
--
-- No status column: a page whose founder's note can be switched off leaves a
-- band of empty cream between the hero and the timeline. A missing row means
-- "never authored", and the site keeps its own built-in copy for that.

CREATE TABLE about_founder_note (
  id              SMALLINT      PRIMARY KEY DEFAULT 1,

  -- 'Neil SR Mashalkar'. Sized like admins.first_name + last_name together.
  founder_name    VARCHAR(120)  NOT NULL,

  -- The line under the name on the card ('Founder & CEO').
  founder_role    VARCHAR(120)  NOT NULL,

  -- The small orange line under that ('Founder of Byte Elephants
  -- Technologies'). A separate column rather than part of the role, because
  -- the card renders it in its own type at its own size - joining them would
  -- mean the site splitting a string back apart on a separator an admin typed.
  company_line    VARCHAR(160)  NOT NULL,

  -- The pull-quote, rendered between typographic quote marks the site supplies
  -- (so the stored text carries none). TEXT rather than VARCHAR: it is a
  -- paragraph-shaped thing whose ceiling is an editorial judgement the
  -- validator makes, not a storage decision.
  quote           TEXT          NOT NULL,

  -- The paragraph under the quote.
  body            TEXT          NOT NULL,

  /*
   * An optional photograph of the founder.
   *
   * Two sources, at most one of them set at a time:
   *   photo_url      an absolute URL or a site-relative path ('/images/x.webp')
   *   photo_file_id  an asset uploaded through the files module
   *
   * Both NULL as seeded, which is the point: the card then renders the
   * initials monogram it renders today, and publishing this section must not
   * change the page until somebody uploads a portrait. The site derives the
   * monogram itself - there is no initials column, because initials that could
   * disagree with the name are worse than none.
   *
   * No photo_alt column: derived from the name and role server-side, so a
   * portrait is never announced unlabelled and there is no second field to
   * keep in step with the person.
   */
  photo_url       VARCHAR(1000),
  photo_file_id   UUID          REFERENCES files(id) ON DELETE SET NULL,

  updated_by      UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT about_founder_note_singleton_check
    CHECK (id = 1),

  CONSTRAINT about_founder_note_single_photo_source_check
    CHECK (photo_url IS NULL OR photo_file_id IS NULL),

  CONSTRAINT about_founder_note_copy_not_blank_check
    CHECK (
      btrim(founder_name) <> '' AND btrim(founder_role) <> ''
      AND btrim(company_line) <> '' AND btrim(quote) <> '' AND btrim(body) <> ''
    )
);

-- No photo_file_id index, unlike the list tables: a one-row table is its own
-- index.

CREATE TRIGGER about_founder_note_set_updated_at
  BEFORE UPDATE ON about_founder_note
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
