-- About page CMS: the closing CTA banner, directly above the footer.
--
-- A wide inset card: a photograph of an office with the page's closing headline
-- and description set over the bright half of it, and two buttons under them.
-- One of them, so a singleton pinned to id = 1.
--
-- The two buttons are NOT here: they point at /demo and /contact, they are the
-- same pair every closing CTA on the site carries, and nobody asked for a link
-- editor.
--
-- No eyebrow column either, unlike every other section on this page: this
-- banner has never had one. A column for a thing the design does not render
-- would be an empty input in the admin form and an invitation to fill it.
--
-- No status column: a page whose closing CTA can be switched off ends on a
-- dark ambitions block with nowhere to go next.

CREATE TABLE about_cta_section (
  id             SMALLINT      PRIMARY KEY DEFAULT 1,

  -- Home page heading markup (utils/heading-markup): a newline is a line
  -- break, **like this** is the orange gradient accent. The page's own copy is
  -- one line with the closing phrase accented.
  heading        TEXT          NOT NULL,

  subtext        TEXT          NOT NULL,

  /*
   * The banner artwork. Two sources, at most one set at a time - see
   * about_founder_note.photo_url for the pair's reasoning.
   *
   * ONE image, not the desktop/mobile pair contact_hero_section carries. The
   * section renders two crops today, and the phone one is a portrait
   * composition of its own rather than a second size of the same picture - a
   * separate piece of artwork, which is a second authoring job nobody asked
   * for. The admin gets the wide banner, which is the one the section is
   * recognised by; the phone crop stays in the website's code.
   *
   * Seeded with the path the site already ships, unlike the two photo slots on
   * this page: this image is not a placeholder standing in for a person, it is
   * the section itself, and an unset banner would publish a CTA with no
   * artwork behind the copy.
   *
   * No image_alt column: the artwork is decorative (the section renders it
   * aria-hidden), and where alt text is needed it is derived from the heading
   * server-side.
   */
  image_url      VARCHAR(1000),
  image_file_id  UUID          REFERENCES files(id) ON DELETE SET NULL,

  updated_by     UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT about_cta_section_singleton_check
    CHECK (id = 1),

  CONSTRAINT about_cta_section_single_image_source_check
    CHECK (image_url IS NULL OR image_file_id IS NULL),

  CONSTRAINT about_cta_section_copy_not_blank_check
    CHECK (btrim(heading) <> '' AND btrim(subtext) <> '')
);

-- No image_file_id index, unlike the list tables: a one-row table is its own
-- index.

CREATE TRIGGER about_cta_section_set_updated_at
  BEFORE UPDATE ON about_cta_section
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
