-- WMS product page CMS: "15-20% Less Wastage. 20-35% Better Fulfilment
-- Accuracy."
--
-- A heading over a row of five outcome cards. Each card is a pictogram in a
-- round tile, the figure it claims, what that figure measures, and a line
-- saying how the system gets there.
--
-- One table, because a card is one thing. This is not the ERP page's outcome
-- cards despite the shared section key: those are customer stories - a
-- photograph, a quote and who said it - where these are unattributed range
-- figures across a whole category. Same word, different object, so a separate
-- table rather than a widened one.
--
-- No image anywhere here. The artwork in the section's top-right corner is a
-- decorative fade behind the heading, not per-card content, so it stays with
-- the site.
--
-- The eyebrow, heading and subtext above the row live once in
-- page_section_copy under ('wms', 'outcomes'). Both halves of that key
-- already pass their checks - 'wms' was widened in by 062, and 'outcomes' is
-- used by the ERP page - so no constraint widens here.

CREATE TABLE wms_outcome_cards (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A name from the icon allowlist, not a file: the site draws these with
  -- lucide-react, which exports components rather than images.
  icon              VARCHAR(60)   NOT NULL,

  /*
   * The figure, written exactly as it should read.
   *
   * These are ranges and qualifiers - "15-20%", "99%+" - carrying their own
   * punctuation, so the site prints the string rather than formatting a
   * number it was handed. The same reasoning as erp_outcome_cards.stat.
   */
  stat              VARCHAR(40)   NOT NULL,
  -- What the figure measures, as the card's heading: "Less Wastage".
  title             VARCHAR(160)  NOT NULL,
  /*
   * The line under the rule, saying how the system gets there.
   *
   * Bounded rather than TEXT: the five cards sit in one row and every card is
   * the height of its tallest neighbour, so one long line pushes the whole
   * row taller. The longest shipped line is 88 characters.
   */
  description       VARCHAR(300)  NOT NULL,

  /*
   * Which colour the card's hover rule draws in.
   *
   * Nearly invisible, and kept anyway. The shipped set alternates orange and
   * blue down the row, and today that choice reaches exactly one element -
   * the 3px line that grows along the bottom edge on hover; the icon tile,
   * the figure and the static rule are orange on every card regardless.
   * Dropping the column would quietly make every hover line orange, which is
   * a design change rather than a simplification, so it is stored - with a
   * default, so an editor who does not care never has to choose.
   */
  accent            VARCHAR(10)   NOT NULL DEFAULT 'orange',

  display_order     INTEGER       NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',

  created_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  updated_by        UUID          REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT wms_outcome_cards_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT wms_outcome_cards_accent_check
    CHECK (accent IN ('orange', 'blue')),
  CONSTRAINT wms_outcome_cards_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT wms_outcome_cards_not_blank_check
    CHECK (
      btrim(icon) <> ''
      AND btrim(stat) <> ''
      AND btrim(title) <> ''
      AND btrim(description) <> ''
    )
);

-- The admin list and the public read both walk the row in its own order,
-- which is the only ordering either one asks for.
CREATE INDEX idx_wms_outcome_cards_order
  ON wms_outcome_cards (display_order, created_at);
CREATE INDEX idx_wms_outcome_cards_status
  ON wms_outcome_cards (status);

CREATE TRIGGER wms_outcome_cards_set_updated_at
  BEFORE UPDATE ON wms_outcome_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
