-- WMS product page CMS: the warehouse-type map.
--
-- "Built for All Types of Warehouses." An eyebrow, a heading and a line of
-- subtext over a grid of cards, each naming one kind of warehouse - cold
-- storage, bakery FG, raw material stores, multi-plant distribution - so a
-- visitor finds their own operation in the list immediately.
--
-- One table, because a card is one thing: a picture, a name and a line about
-- it. The POS page's equivalent stores an icon name instead, because that
-- grid is drawn with lucide components; this one is a wall of illustrations,
-- so it stores an image the way every other artwork slot in the CMS does -
-- either a site-relative path or an uploaded file, never both.
--
-- No `alt` column, unlike wms_proof_slides. There the figures are baked into
-- the artwork, so alt text is the only way they reach a screen reader. Here
-- the title and description sit in the markup directly under the picture,
-- which makes the illustration decorative and an empty alt the correct
-- markup for it.
--
-- The eyebrow, heading and subtext live once in page_section_copy under
-- ('wms', 'recognition'). Both halves of that key already pass their checks -
-- 'wms' was widened in by 062, and 'recognition' is used by the ERP, FMS and
-- POS pages - so no constraint widens here.

CREATE TABLE wms_recognition_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The kind of warehouse, as the card's heading.
  title             VARCHAR(160)  NOT NULL,
  /*
   * The line under it. Bounded rather than TEXT: every card in the grid is
   * the same height as its tallest neighbour, so one long description pushes
   * an entire row of cards taller. The longest shipped line is 71 characters.
   */
  description       VARCHAR(240)  NOT NULL,

  /*
   * The illustration above the title, from one of two mutually exclusive
   * sources, and required: a card is a picture with a caption, so one without
   * the picture is a hole in a grid where every neighbour has one.
   */
  image_url         VARCHAR(1000),
  image_file_id     UUID          REFERENCES files(id) ON DELETE SET NULL,

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT wms_recognition_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT wms_recognition_cards_display_order_check
    CHECK (display_order >= 0),
  -- Exactly one source: neither both at once nor neither at all.
  CONSTRAINT wms_recognition_cards_image_required_check
    CHECK (num_nonnulls(image_url, image_file_id) = 1),
  CONSTRAINT wms_recognition_cards_not_blank_check
    CHECK (btrim(title) <> '' AND btrim(description) <> '')
);

-- The admin list and the public read both walk the grid in its own order,
-- which is the only ordering either one asks for.
CREATE INDEX idx_wms_recognition_cards_order
  ON wms_recognition_cards (display_order, created_at);
CREATE INDEX idx_wms_recognition_cards_status
  ON wms_recognition_cards (status);
CREATE INDEX idx_wms_recognition_cards_image_file
  ON wms_recognition_cards (image_file_id)
  WHERE image_file_id IS NOT NULL;

CREATE TRIGGER wms_recognition_cards_set_updated_at
  BEFORE UPDATE ON wms_recognition_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
