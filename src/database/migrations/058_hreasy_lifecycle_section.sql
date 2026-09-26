-- HREasy product page CMS: "Everything From Hiring to Exit - For Every Kind
-- of Employee You Have."
--
-- A grid of capability cards, four across with the final three centred. Each
-- is a photograph, a title and a one-line outcome.
--
-- Not to be confused with the lifecycle switcher in 056, which the site calls
-- its module showcase: that one is a nav list whose panel is a single
-- composite image, and its copy lives under ('hreasy', 'capabilities'). This
-- is the card grid further down the page, and its copy lives under
-- ('hreasy', 'lifecycle'). The two list the same seven stages and are still
-- two different sections, each with its own artwork.
--
-- Unlike the switcher's modules there is no slug here: a card is not
-- selectable and nothing links to one, so there is no key for the site to
-- hold on to and no reason to make an editor invent one.
--
-- The section key is new, so page_section_copy's check widens first.

ALTER TABLE page_section_copy
  DROP CONSTRAINT page_section_copy_section_key_check;

ALTER TABLE page_section_copy
  ADD CONSTRAINT page_section_copy_section_key_check
    CHECK (section_key IN (
      -- home page
      'trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta',
      -- ERP product page
      'hero', 'recognition', 'benefits', 'alternatives', 'outcomes', 'establishers',
      -- SFA-DMS product page
      'proof', 'video', 'packages',
      -- HREasy product page
      'capabilities', 'lifecycle'
    ));

-- ── the cards ─────────────────────────────────────────────────────────────

CREATE TABLE hreasy_lifecycle_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The bold line under the photograph: "Payroll & Statutory Compliance".
  title             VARCHAR(160)  NOT NULL,
  /*
   * The outcome under it, one line: "PF, ESI, PT, TDS calculated and deducted
   * automatically."
   *
   * The editorial point of the section is that these are outcomes rather than
   * a feature list, which is why the card carries a sentence and not a bullet.
   */
  description       TEXT          NOT NULL,

  /*
   * The photograph at the top of the card, from one of two mutually exclusive
   * sources, and required: a card is a picture with a caption, so one without
   * the picture is a hole in a grid of seven.
   */
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hreasy_lifecycle_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT hreasy_lifecycle_cards_display_order_check
    CHECK (display_order >= 0),
  -- Exactly one source: neither both at once nor neither at all.
  CONSTRAINT hreasy_lifecycle_cards_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT hreasy_lifecycle_cards_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '')
);

CREATE INDEX idx_hreasy_lifecycle_cards_order
  ON hreasy_lifecycle_cards (display_order, created_at);
CREATE INDEX idx_hreasy_lifecycle_cards_status
  ON hreasy_lifecycle_cards (status);
CREATE INDEX idx_hreasy_lifecycle_cards_image_file
  ON hreasy_lifecycle_cards (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER hreasy_lifecycle_cards_set_updated_at
  BEFORE UPDATE ON hreasy_lifecycle_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
