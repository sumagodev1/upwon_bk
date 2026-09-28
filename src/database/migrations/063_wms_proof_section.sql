-- WMS product page CMS: "Not a Pitch. Just What's Already Running."
--
-- Three cards in a row, each cycling through its own set of stat images every
-- few seconds. Nine images today, in three sets of three.
--
-- Two tables, because the row is two things: the cards are the arrangement -
-- how many columns the row has and in what order - and the slides are what
-- each one shows.
--
--   wms_proof_cards   one column of the row
--   wms_proof_slides  the images that column flips through, cascading
--
-- A card carries no copy of its own. Every word a visitor reads here - the
-- chip, the figure, the description and the bullet list - is inside the
-- artwork, so fields for them would be a second copy of text already baked
-- into the picture, and the two would drift. That is also why a slide carries
-- alt text: it is the only way the numbers reach a screen reader at all.
--
-- The eyebrow, heading and subtext above the row live once in
-- page_section_copy under ('wms', 'proof'). That section key is already
-- allowed - the SFA-DMS, FMS, POS and HREasy pages use it - so no check
-- widens here.

-- ── the cards ─────────────────────────────────────────────────────────────

CREATE TABLE wms_proof_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * What this column is called in the admin list - "Put-away", "Expiry
   * errors", "Multi-site".
   *
   * Never rendered: the card is its artwork. It exists because three rows
   * distinguished only by the pictures inside them are hard to tell apart in
   * a list, and an editor reordering the row needs to know which is which.
   */
  label             VARCHAR(120)  NOT NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT wms_proof_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT wms_proof_cards_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT wms_proof_cards_not_blank_check
    CHECK (btrim(label) <> '')
);

CREATE INDEX idx_wms_proof_cards_order ON wms_proof_cards (display_order, created_at);
CREATE INDEX idx_wms_proof_cards_status ON wms_proof_cards (status);

-- ── the slides ────────────────────────────────────────────────────────────

CREATE TABLE wms_proof_slides (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CASCADE: a slide has no meaning apart from the card it flips inside.
  card_id           UUID          NOT NULL
                                  REFERENCES wms_proof_cards(id) ON DELETE CASCADE,

  /*
   * The stat artwork, from one of two mutually exclusive sources, and
   * required: the slide is the image, so one without it is a blank frame in a
   * card that is otherwise a picture.
   */
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  /*
   * What a screen reader reads in the image's place.
   *
   * The figure, the claim and the bullets are all inside the artwork, so
   * without this the section says nothing at all to anyone not looking at it.
   * Optional rather than required: a card mid-edit should be savable, and an
   * empty alt is the correct markup for a decorative repeat.
   */
  alt               VARCHAR(255),

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT wms_proof_slides_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT wms_proof_slides_display_order_check
    CHECK (display_order >= 0),
  -- Exactly one source: neither both at once nor neither at all.
  CONSTRAINT wms_proof_slides_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  -- Absent is how alt text is left off; blank is a stored empty string that
  -- reads the same but looks like an oversight, so it is rejected.
  CONSTRAINT wms_proof_slides_alt_check
    CHECK (alt IS NULL OR btrim(alt) <> '')
);

-- Covers both the admin list (one card's slides, in order) and the public
-- read (the active ones), which are the only two queries.
CREATE INDEX idx_wms_proof_slides_by_card
  ON wms_proof_slides (card_id, display_order, created_at);
CREATE INDEX idx_wms_proof_slides_image_file
  ON wms_proof_slides (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER wms_proof_cards_set_updated_at
  BEFORE UPDATE ON wms_proof_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER wms_proof_slides_set_updated_at
  BEFORE UPDATE ON wms_proof_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
